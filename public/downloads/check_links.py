import argparse
import http.client
import ipaddress
import json
import os
import socket
import ssl
import time
from pathlib import Path
from urllib.parse import quote, urldefrag, urljoin, urlsplit


MAX_URLS = 50
MAX_REDIRECTS = 5
MAX_FILE_BYTES = 1_000_000
REDIRECT_STATUSES = {301, 302, 303, 307, 308}


class CheckError(Exception):
    def __init__(self, code, message):
        super().__init__(message)
        self.code = code


def validate_url(url, allow_http=False):
    if not isinstance(url, str) or not url or len(url) > 8192:
        raise CheckError("INVALID_URL", "Geçersiz URL.")
    if any(ord(character) <= 32 or ord(character) == 127 for character in url):
        raise CheckError("INVALID_URL", "URL kontrol karakteri veya boşluk içeriyor.")
    try:
        parts = urlsplit(url)
        if parts.scheme not in {"http", "https"} or not parts.hostname:
            raise ValueError()
        if parts.username is not None or parts.password is not None:
            raise CheckError("BLOCKED", "URL içindeki kullanıcı adı/parola engellendi.")
        port = parts.port or (443 if parts.scheme == "https" else 80)
        if port != (443 if parts.scheme == "https" else 80):
            raise CheckError("BLOCKED", "Standart dışı port engellendi.")
        if parts.scheme == "http" and not allow_http:
            raise CheckError("BLOCKED", "Şifresiz HTTP engellendi; gerekirse --allow-http kullanın.")
        hostname = parts.hostname.encode("idna").decode("ascii")
        if hostname.rstrip(".").lower() == "localhost" or hostname.rstrip(".").lower().endswith((".localhost", ".local", ".internal")):
            raise CheckError("BLOCKED", "Yerel alan adı engellendi.")
    except (ValueError, UnicodeError):
        raise CheckError("INVALID_URL", "Geçersiz URL.") from None
    return parts, hostname, port


def resolve_public(hostname, port):
    try:
        addresses = socket.getaddrinfo(hostname, port, type=socket.SOCK_STREAM)
    except socket.gaierror:
        raise CheckError("DNS_ERROR", "DNS çözümlemesi başarısız.") from None
    if not addresses:
        raise CheckError("DNS_ERROR", "DNS adresi bulunamadı.")
    for family, socktype, protocol, canonical, address in addresses:
        resolved = ipaddress.ip_address(address[0].split("%")[0])
        mapped = getattr(resolved, "ipv4_mapped", None)
        embedded = getattr(resolved, "sixtofour", None)
        if (
            not resolved.is_global or resolved.is_multicast
            or (mapped is not None and not mapped.is_global)
            or embedded is not None or getattr(resolved, "teredo", None) is not None
            or (resolved.version == 6 and resolved in ipaddress.ip_network("64:ff9b::/96"))
            or (resolved.version == 6 and resolved in ipaddress.ip_network("64:ff9b:1::/48"))
        ):
            raise CheckError("BLOCKED", "Yerel, özel veya ayrılmış ağ hedefi engellendi.")
    return addresses[0]


def request_headers(url, timeout, allow_http=False):
    parts, hostname, port = validate_url(url, allow_http)
    family, socktype, protocol, canonical, address = resolve_public(hostname, port)
    connection = http.client.HTTPConnection(hostname, port, timeout=timeout)
    transport = socket.socket(family, socktype, protocol)
    transport.settimeout(timeout)
    try:
        transport.connect(address)
        if parts.scheme == "https":
            transport = ssl.create_default_context().wrap_socket(transport, server_hostname=hostname)
        connection.sock = transport
        target = quote(parts.path or "/", safe="/%:@!$&'()*+,;=-._~")
        if parts.query:
            target += "?" + quote(parts.query, safe="/%?:@!$&'()*+,;=-._~")
        connection.request("GET", target, headers={
            "User-Agent": "LocalLinkChecker/1.0",
            "Accept": "*/*",
            "Connection": "close",
        })
        response = connection.getresponse()
        try:
            return response.status, response.getheader("Location")
        finally:
            response.close()
    finally:
        connection.close()
        transport.close()


def classify(status, redirected=False):
    if 200 <= status < 300:
        return ("working-redirected" if redirected else "working"), "ok"
    if status in {404, 410}:
        return "not-found", "client-error"
    if status == 403:
        return "forbidden", "client-error"
    if 400 <= status < 500:
        return "client-error", "client-error"
    if 500 <= status < 600:
        return "server-error", "server-error"
    return "unreachable", "redirect" if 300 <= status < 400 else "network-error"


def check_url(url, allow_http=False, allow_cross_domain=False, requester=None):
    requester = requester or request_headers
    started = time.monotonic()
    result = {
        "originalUrl": url, "url": url, "working": False,
        "classification": "unreachable", "status": "network-error",
        "redirectCount": 0, "redirects": [],
    }
    visited = set()
    try:
        validate_url(url, allow_http)
        current = urldefrag(url)[0]
        for step in range(MAX_REDIRECTS + 1):
            validate_url(current, allow_http)
            if current in visited:
                raise CheckError("REDIRECT_LOOP", "Yönlendirme döngüsü tespit edildi.")
            visited.add(current)
            result["finalUrl"] = current
            result.pop("finalStatus", None)
            status, location = requester(current, 10, allow_http)
            if "initialStatus" not in result:
                result["initialStatus"] = status
            result["finalStatus"] = status
            if status not in REDIRECT_STATUSES:
                classification, state = classify(status, bool(result["redirectCount"]))
                result.update(classification=classification, status=state, working=state == "ok")
                result["message"] = "Yerel kontrol tamamlandı; yalnızca HTTP yanıt başlıkları incelendi."
                break
            if not location:
                raise CheckError("MISSING_LOCATION", "Yönlendirme yanıtında Location başlığı yok.")
            if step == MAX_REDIRECTS:
                raise CheckError("REDIRECT_LIMIT", "En fazla 5 yönlendirme izlenebilir; sonraki hedef sorgulanmadı.")
            target = urldefrag(urljoin(current, location))[0]
            _, current_host, _ = validate_url(current, allow_http)
            _, target_host, _ = validate_url(target, allow_http)
            if current_host != target_host and not allow_cross_domain:
                raise CheckError("BLOCKED", "Farklı alan adına yönlendirme engellendi; gerekirse --allow-cross-domain-redirects kullanın.")
            if target in visited:
                raise CheckError("REDIRECT_LOOP", "Yönlendirme döngüsü tespit edildi.")
            result["redirects"].append({"url": current, "status": status})
            result["redirectCount"] += 1
            current = target
    except CheckError as error:
        classifications = {
            "BLOCKED": "blocked-security", "INVALID_URL": "invalid-url",
            "DNS_ERROR": "dns-error", "REDIRECT_LIMIT": "redirect-limit",
            "REDIRECT_LOOP": "redirect-loop",
        }
        result.update(classification=classifications.get(error.code, "unreachable"),
                      status="blocked" if error.code == "BLOCKED" else "network-error",
                      errorCode=error.code, error=str(error))
    except (TimeoutError, socket.timeout):
        result.update(classification="timeout", status="timeout", errorCode="TIMEOUT", error="İstek zaman aşımına uğradı.")
    except ssl.SSLError:
        result.update(classification="tls-error", errorCode="TLS_ERROR", error="TLS bağlantısı veya sertifika doğrulaması başarısız.")
    except (OSError, http.client.HTTPException, ValueError):
        result.update(errorCode="NETWORK_ERROR", error="Bağlantı kurulamadı veya geçerli HTTP yanıtı alınamadı.")
    result["responseTimeMs"] = round((time.monotonic() - started) * 1000)
    return result


def load_urls(path):
    if path.stat().st_size > MAX_FILE_BYTES:
        raise ValueError("Girdi dosyası en fazla 1 MB olabilir.")
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict) or data.get("version") != 1 or not isinstance(data.get("urls"), list):
        raise ValueError("Link Checker tarafından indirilen bağlantı JSON dosyasını kullanın.")
    urls = data["urls"]
    if not urls or len(urls) > MAX_URLS or any(not isinstance(url, str) or len(url) > 8192 for url in urls):
        raise ValueError("Girdi 1–50 geçerli URL metni içermelidir.")
    return list(dict.fromkeys(urls))


def main():
    parser = argparse.ArgumentParser(description="Yerel URL kontrolü: kampanya metni veya sonuçları hiçbir servise yüklemez.")
    parser.add_argument("input", type=Path)
    parser.add_argument("--output", type=Path, default=Path("link-report.json"))
    parser.add_argument("--allow-network", action="store_true", help="Hedef sitelerin URL ve IP adresinizi, DNS sağlayıcısının alan adlarını görebileceğini kabul edin.")
    parser.add_argument("--allow-http", action="store_true", help="Şifresiz HTTP isteklerine açıkça izin verin.")
    parser.add_argument("--allow-cross-domain-redirects", action="store_true", help="Yönlendirme URL'lerinin farklı alan adlarına gönderilmesine açıkça izin verin.")
    args = parser.parse_args()
    if not args.allow_network:
        parser.error("Ağ kontrolü açık onay gerektirir: --allow-network. URL'ler kişisel veri veya erişim belirteci içerebilir.")
    try:
        urls = load_urls(args.input)
        descriptor = os.open(args.output, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    except (OSError, ValueError):
        parser.error("Girdi geçersiz veya çıktı oluşturulamadı. Var olan raporun üzerine yazılmaz; farklı --output kullanın.")
    with os.fdopen(descriptor, "w", encoding="utf-8") as output:
        results = [check_url(url, args.allow_http, args.allow_cross_domain_redirects) for url in urls]
        json.dump({"version": 1, "source": "local-python", "results": results}, output, ensure_ascii=False, indent=2)
    print(f"{len(results)} bağlantı kontrol edildi. Rapor yerel dosyaya kaydedildi; URL'ler konsola yazılmadı.")


if __name__ == "__main__":
    main()
