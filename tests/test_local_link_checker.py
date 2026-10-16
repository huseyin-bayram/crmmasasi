import importlib.util
import json
import socket
import ssl
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch


SCRIPT = Path(__file__).resolve().parents[1] / "public/downloads/check_links.py"
SPEC = importlib.util.spec_from_file_location("local_checker", SCRIPT)
checker = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(checker)


class LocalCheckerTests(unittest.TestCase):
    def test_five_redirects_and_final_response(self):
        request = Mock(side_effect=[
            (301, "/1"), (302, "/2"), (303, "/3"),
            (307, "/4"), (308, "/5"), (200, None),
        ])
        result = checker.check_url("https://example.test/0#private-fragment", requester=request)
        self.assertTrue(result["working"])
        self.assertEqual(result["redirectCount"], 5)
        self.assertEqual(result["initialStatus"], 301)
        self.assertEqual(result["finalStatus"], 200)
        self.assertEqual(result["finalUrl"], "https://example.test/5")
        self.assertEqual(request.call_count, 6)
        self.assertEqual(request.call_args_list[0].args[0], "https://example.test/0")

    def test_sixth_redirect_is_not_followed(self):
        request = Mock(side_effect=[(302, f"/{step}") for step in range(1, 7)])
        result = checker.check_url("https://example.test/0", requester=request)
        self.assertEqual(result["errorCode"], "REDIRECT_LIMIT")
        self.assertEqual(result["redirectCount"], 5)
        self.assertEqual(result["finalStatus"], 302)
        self.assertEqual(request.call_count, 6)

    def test_http_error_statuses(self):
        for status, classification in [(400, "client-error"), (403, "forbidden"), (404, "not-found"), (410, "not-found"), (429, "client-error"), (500, "server-error"), (503, "server-error")]:
            with self.subTest(status=status):
                result = checker.check_url("https://example.test/", requester=Mock(return_value=(status, None)))
                self.assertFalse(result["working"])
                self.assertEqual(result["classification"], classification)
                self.assertEqual(result["finalStatus"], status)

    def test_redirect_privacy_defaults(self):
        request = Mock(return_value=(302, "https://other.test/private?token=test"))
        result = checker.check_url("https://example.test/", requester=request)
        self.assertEqual(result["errorCode"], "BLOCKED")
        self.assertEqual(request.call_count, 1)
        request = Mock(side_effect=[(302, "https://other.test/"), (200, None)])
        self.assertTrue(checker.check_url("https://example.test/", allow_cross_domain=True, requester=request)["working"])
        request = Mock(return_value=(302, "http://example.test/"))
        self.assertEqual(checker.check_url("https://example.test/", requester=request)["errorCode"], "BLOCKED")

    def test_redirect_loop_and_missing_location(self):
        request = Mock(return_value=(301, "/"))
        self.assertEqual(checker.check_url("https://example.test/", requester=request)["errorCode"], "REDIRECT_LOOP")
        self.assertEqual(request.call_count, 1)
        self.assertEqual(checker.check_url("https://example.test/", requester=Mock(return_value=(302, None)))["errorCode"], "MISSING_LOCATION")

    def test_invalid_credentials_ports_and_local_names_make_no_requests(self):
        for url in ["https://user:password@example.test/", "https://example.test:444/", "http://example.test/", "https://localhost/", "https://printer.local/", "https://[invalid/", "file:///etc/passwd", "https://example.test/\r\nInjected: value"]:
            request = Mock()
            result = checker.check_url(url, requester=request)
            self.assertFalse(result["working"])
            request.assert_not_called()

    def test_dns_rejects_private_mixed_and_embedded_addresses(self):
        for addresses in [["127.0.0.1"], ["10.0.0.1"], ["169.254.169.254"], ["93.184.216.34", "192.168.0.1"], ["::1"], ["::ffff:127.0.0.1"], ["64:ff9b::7f00:1"], ["2002:7f00:1::"], ["224.0.0.1"]]:
            values = [(socket.AF_INET6 if ":" in address else socket.AF_INET, socket.SOCK_STREAM, 6, "", (address, 443)) for address in addresses]
            with patch.object(checker.socket, "getaddrinfo", return_value=values), patch.object(checker.socket, "socket") as transport:
                result = checker.check_url("https://example.test/")
                self.assertEqual(result["errorCode"], "BLOCKED")
                transport.assert_not_called()

    def test_transport_pins_validated_ip_and_reads_no_body(self):
        address = ("93.184.216.34", 443)
        transport = Mock()
        connection = Mock()
        response = connection.getresponse.return_value
        response.status = 200
        response.getheader.return_value = None
        context = Mock()
        context.wrap_socket.return_value = transport
        with patch.object(checker.socket, "getaddrinfo", return_value=[(socket.AF_INET, socket.SOCK_STREAM, 6, "", address)]) as dns, patch.object(checker.socket, "socket", return_value=transport), patch.object(checker.http.client, "HTTPConnection", return_value=connection), patch.object(checker.ssl, "create_default_context", return_value=context):
            self.assertEqual(checker.request_headers("https://example.test/path?token=test", 10), (200, None))
            dns.assert_called_once()
            transport.connect.assert_called_once_with(address)
            context.wrap_socket.assert_called_once_with(transport, server_hostname="example.test")
            headers = connection.request.call_args.kwargs["headers"]
            self.assertEqual(set(headers), {"User-Agent", "Accept", "Connection"})
            self.assertEqual(connection.request.call_args.args, ("GET", "/path?token=test"))
            response.read.assert_not_called()
            connection.close.assert_called_once()

    def test_private_redirect_blocked_before_second_connection(self):
        response = Mock(status=302)
        response.getheader.return_value = "https://127.0.0.1/"
        with patch.object(checker, "resolve_public", side_effect=[(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 443)), checker.CheckError("BLOCKED", "Engellendi")]), patch.object(checker.socket, "socket") as transport, patch.object(checker.ssl, "create_default_context"), patch.object(checker.http.client, "HTTPConnection") as connection:
            connection.return_value.getresponse.return_value = response
            result = checker.check_url("https://example.test/", allow_cross_domain=True)
            self.assertEqual(result["errorCode"], "BLOCKED")
            self.assertEqual(transport.call_count, 1)
            self.assertNotIn("finalStatus", result)

    def test_errors_do_not_expose_exception_details(self):
        for error, code in [(socket.gaierror("private data"), "NETWORK_ERROR"), (TimeoutError("private data"), "TIMEOUT"), (ssl.SSLError("private data"), "TLS_ERROR"), (OSError("private data"), "NETWORK_ERROR")]:
            result = checker.check_url("https://example.test/", requester=Mock(side_effect=error))
            self.assertEqual(result["errorCode"], code)
            self.assertNotIn("private data", result["error"])

    def test_cli_requires_network_consent_without_creating_report(self):
        with tempfile.TemporaryDirectory() as folder:
            output = Path(folder) / "report.json"
            result = subprocess.run([sys.executable, "-B", str(SCRIPT), "missing.json", "--output", str(output)], capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("--allow-network", result.stderr)
            self.assertFalse(output.exists())

    def test_input_limits_and_deduplication(self):
        with tempfile.TemporaryDirectory() as folder:
            source = Path(folder) / "input.json"
            source.write_text(json.dumps({"version": 1, "urls": ["https://example.test/"] * 2}))
            self.assertEqual(checker.load_urls(source), ["https://example.test/"])
            source.write_text(json.dumps({"version": 1, "urls": ["https://example.test/"] * 51}))
            with self.assertRaises(ValueError):
                checker.load_urls(source)


if __name__ == "__main__":
    unittest.main()
