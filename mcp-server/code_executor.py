"""
Code Execution HTTP Server
为像素 IDE 提供 Python 和 C++ 代码执行服务
"""
import http.server
import json
import subprocess
import tempfile
import os
import urllib.parse
import threading

PORT = 8765

def execute_python(code):
    try:
        result = subprocess.run(
            ["python3", "-c", code],
            capture_output=True,
            text=True,
            timeout=30
        )
        return {
            "success": result.returncode == 0,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "return_code": result.returncode
        }
    except subprocess.TimeoutExpired:
        return {"success": False, "stdout": "", "stderr": "Error: 代码执行超时（超过30秒）", "return_code": -1}
    except Exception as e:
        return {"success": False, "stdout": "", "stderr": f"Error: {str(e)}", "return_code": -1}

def execute_cpp(code):
    try:
        with tempfile.NamedTemporaryFile(mode='w', suffix='.cpp', delete=False) as f:
            f.write(code)
            cpp_file = f.name
        
        exe_file = cpp_file.replace('.cpp', '.out')
        
        compile_result = subprocess.run(
            ["g++", cpp_file, "-o", exe_file, "-std=c++17"],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if compile_result.returncode != 0:
            os.unlink(cpp_file)
            return {"success": False, "stdout": "", "stderr": f"编译错误:\n{compile_result.stderr}", "return_code": compile_result.returncode}
        
        run_result = subprocess.run([exe_file], capture_output=True, text=True, timeout=30)
        
        os.unlink(cpp_file)
        os.unlink(exe_file)
        
        return {"success": run_result.returncode == 0, "stdout": run_result.stdout, "stderr": run_result.stderr, "return_code": run_result.returncode}
    except subprocess.TimeoutExpired:
        try:
            os.unlink(cpp_file)
            os.unlink(exe_file)
        except:
            pass
        return {"success": False, "stdout": "", "stderr": "Error: 代码执行超时（超过30秒）", "return_code": -1}
    except FileNotFoundError:
        return {"success": False, "stdout": "", "stderr": "Error: 未找到 g++ 编译器，请确保已安装 g++", "return_code": -2}
    except Exception as e:
        try:
            os.unlink(cpp_file)
            os.unlink(exe_file)
        except:
            pass
        return {"success": False, "stdout": "", "stderr": f"Error: {str(e)}", "return_code": -1}

class CodeExecHandler(http.server.BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_POST(self):
        if self.path != '/execute':
            self.send_response(404)
            self.end_headers()
            return
        
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8')
        
        try:
            data = json.loads(body)
            code = data.get('code', '')
            language = data.get('language', 'python')
        except:
            data = urllib.parse.parse_qs(body)
            code = data.get('code', [''])[0]
            language = data.get('language', ['python'])[0]
        
        if language.lower() == 'cpp':
            result = execute_cpp(code)
        else:
            result = execute_python(code)
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(result).encode('utf-8'))
    
    def log_message(self, format, *args):
        pass

def start_server():
    server = http.server.HTTPServer(('127.0.0.1', PORT), CodeExecHandler)
    print(f"代码执行服务器启动在 http://127.0.0.1:{PORT}")
    server.serve_forever()

if __name__ == "__main__":
    start_server()
