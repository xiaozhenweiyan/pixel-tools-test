/**
 * expression-parser.js
 * 安全的数学表达式解析器
 *
 * 安全特性：
 *   - Token 级解析 + AST 评估，不使用 eval 或 new Function
 *   - 严格字符白名单
 *   - 递归深度限制（最大 100 层）
 *   - 纯函数求值，不访问外部对象
 *
 * 支持：
 *   - 数字（整数、小数、科学计数法）
 *   - 变量 x
 *   - 运算符：+ - * / ^ ( )
 *   - 函数：sin, cos, tan, asin, acos, atan, sqrt, abs, log, ln, exp, floor, ceil, round
 *   - 常量：pi, e
 *   - 运算符优先级：^ > * / > + -
 *   - ^ 运算符右结合
 */
(function () {
  'use strict';

  const MAX_RECURSION_DEPTH = 100;

  const VALID_CHARS = /^[0-9a-zA-Z+\-*/^().\s]+$/;

  const FUNCTIONS = {
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    asin: Math.asin,
    acos: Math.acos,
    atan: Math.atan,
    sqrt: Math.sqrt,
    abs: Math.abs,
    log: Math.log10,
    ln: Math.log,
    exp: Math.exp,
    floor: Math.floor,
    ceil: Math.ceil,
    round: Math.round
  };

  const CONSTANTS = {
    pi: Math.PI,
    e: Math.E
  };

  // 支持所有单字母 a-z 作为参数（除 x 是变量外）
  // 注：e 虽在 PARAM_CHARS 中，但 tokenizer 会优先识别为常量（CONSTANTS 检查在前）
  const PARAM_CHARS = 'abcdefghijklmnopqrstuvwyz';

  const TokenType = {
    NUMBER: 'NUMBER',
    VARIABLE: 'VARIABLE',
    PARAM: 'PARAM',
    OPERATOR: 'OPERATOR',
    FUNCTION: 'FUNCTION',
    CONSTANT: 'CONSTANT',
    LPAREN: 'LPAREN',
    RPAREN: 'RPAREN',
    EOF: 'EOF'
  };

  // 将多字符标识符拆分为单字符 token 序列，用于支持隐式乘法（如 ax → a * x）
  // 仅在标识符整体不是函数名/常量名/单字符参数时调用
  // 拆分规则：x → VARIABLE，单字符常量（如 e）→ CONSTANT，其他字母 → PARAM
  // 返回 token 数组；若包含不可识别字符（如数字）则返回 null
  function splitIdentifier(identLower) {
    const result = [];
    for (let k = 0; k < identLower.length; k++) {
      const c = identLower.charAt(k);
      if (c === 'x') {
        result.push({ type: TokenType.VARIABLE, value: 'x' });
      } else if (CONSTANTS.hasOwnProperty(c)) {
        // 单字符常量（如 e）保持常量语义，避免与 Euler 数冲突
        result.push({ type: TokenType.CONSTANT, value: c });
      } else if (PARAM_CHARS.indexOf(c) >= 0) {
        result.push({ type: TokenType.PARAM, value: c });
      } else {
        return null; // 包含不可识别的字符（如数字）
      }
    }
    return result;
  }

  function tokenize(expr) {
    if (typeof expr !== 'string') {
      throw new Error((typeof window !== 'undefined' && window.i18n && window.i18n.t('expr_error_must_be_string')) || '表达式必须是字符串');
    }
    if (!VALID_CHARS.test(expr)) {
      throw new Error((typeof window !== 'undefined' && window.i18n && window.i18n.t('expr_error_illegal_char')) || '包含非法字符');
    }

    const tokens = [];
    let i = 0;
    const len = expr.length;

    while (i < len) {
      const ch = expr.charAt(i);

      if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
        i++;
        continue;
      }

      if ((ch >= '0' && ch <= '9') || (ch === '.' && i + 1 < len && expr.charAt(i + 1) >= '0' && expr.charAt(i + 1) <= '9')) {
        let numStr = '';
        let hasDot = false;
        let hasExp = false;

        while (i < len) {
          const c = expr.charAt(i);
          if (c >= '0' && c <= '9') {
            numStr += c;
            i++;
          } else if (c === '.' && !hasDot && !hasExp) {
            hasDot = true;
            numStr += c;
            i++;
          } else if ((c === 'e' || c === 'E') && !hasExp) {
            hasExp = true;
            numStr += c;
            i++;
            if (i < len && (expr.charAt(i) === '+' || expr.charAt(i) === '-')) {
              numStr += expr.charAt(i);
              i++;
            }
          } else {
            break;
          }
        }

        const num = parseFloat(numStr);
        if (isNaN(num) || !isFinite(num)) {
          throw new Error((typeof window !== 'undefined' && window.i18n && window.i18n.t('expr_error_invalid_number', {val: numStr})) || ('无效数字: ' + numStr));
        }
        tokens.push({ type: TokenType.NUMBER, value: num });
        continue;
      }

      if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z')) {
        let ident = '';
        while (i < len) {
          const c = expr.charAt(i);
          if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9')) {
            ident += c;
            i++;
          } else {
            break;
          }
        }

        const identLower = ident.toLowerCase();

        if (FUNCTIONS.hasOwnProperty(identLower)) {
          tokens.push({ type: TokenType.FUNCTION, value: identLower });
        } else if (CONSTANTS.hasOwnProperty(identLower)) {
          tokens.push({ type: TokenType.CONSTANT, value: identLower });
        } else if (identLower === 'x') {
          tokens.push({ type: TokenType.VARIABLE, value: 'x' });
        } else if (identLower.length === 1 && PARAM_CHARS.indexOf(identLower) >= 0) {
          tokens.push({ type: TokenType.PARAM, value: identLower });
        } else {
          // 多字符标识符：尝试拆分为单字符 token 序列，隐式乘法在 parser 中处理
          // 例如 ax → [a, x]，后续 parser 会解析为 a * x
          const splitTokens = splitIdentifier(identLower);
          if (splitTokens) {
            for (let k = 0; k < splitTokens.length; k++) {
              tokens.push(splitTokens[k]);
            }
          } else {
            throw new Error((typeof window !== 'undefined' && window.i18n && window.i18n.t('expr_error_unknown_identifier', {val: ident})) || ('未知标识符: ' + ident));
          }
        }
        continue;
      }

      if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '^') {
        tokens.push({ type: TokenType.OPERATOR, value: ch });
        i++;
        continue;
      }

      if (ch === '(') {
        tokens.push({ type: TokenType.LPAREN, value: ch });
        i++;
        continue;
      }

      if (ch === ')') {
        tokens.push({ type: TokenType.RPAREN, value: ch });
        i++;
        continue;
      }

      throw new Error((typeof window !== 'undefined' && window.i18n && window.i18n.t('expr_error_unrecognized_char', {val: ch})) || ('无法识别的字符: ' + ch));
    }

    tokens.push({ type: TokenType.EOF, value: null });
    return tokens;
  }

  // 判断 token 是否可以作为一个值的起始（用于隐式乘法判断）
  // NUMBER/VARIABLE/PARAM/CONSTANT/FUNCTION/LPAREN 都可以起始一个值
  function isValueStarter(tok) {
    return tok.type === TokenType.NUMBER ||
           tok.type === TokenType.VARIABLE ||
           tok.type === TokenType.PARAM ||
           tok.type === TokenType.CONSTANT ||
           tok.type === TokenType.FUNCTION ||
           tok.type === TokenType.LPAREN;
  }

  function createParser(tokens) {
    let pos = 0;
    let depth = 0;

    function peek() {
      return tokens[pos];
    }

    function consume() {
      return tokens[pos++];
    }

    function expect(type, errorMsg) {
      const tok = peek();
      if (tok.type !== type) {
        throw new Error(errorMsg || (typeof window !== 'undefined' && window.i18n && window.i18n.t('expr_error_expected_got', {expected: type, got: tok.type})) || ('期望 ' + type + '，得到 ' + tok.type));
      }
      return consume();
    }

    function checkDepth() {
      if (depth > MAX_RECURSION_DEPTH) {
        throw new Error((typeof window !== 'undefined' && window.i18n && window.i18n.t('expr_error_nested_too_deep')) || '表达式嵌套过深');
      }
    }

    function parseExpression() {
      checkDepth();
      depth++;
      const result = parseAddSub();
      depth--;
      return result;
    }

    function parseAddSub() {
      checkDepth();
      depth++;
      let left = parseMulDiv();

      while (peek().type === TokenType.OPERATOR &&
             (peek().value === '+' || peek().value === '-')) {
        const op = consume();
        const right = parseMulDiv();
        left = { type: 'BinaryOp', op: op.value, left: left, right: right };
      }

      depth--;
      return left;
    }

    function parseMulDiv() {
      checkDepth();
      depth++;
      let left = parseUnary();

      while (true) {
        const tok = peek();
        if (tok.type === TokenType.OPERATOR &&
            (tok.value === '*' || tok.value === '/')) {
          const op = consume();
          const right = parseUnary();
          left = { type: 'BinaryOp', op: op.value, left: left, right: right };
        } else if (isValueStarter(tok)) {
          // 隐式乘法：当一个值后紧跟另一个值的起始 token 时，插入乘法
          // 例如：2x → 2*x, ax → a*x, 2(x+1) → 2*(x+1), (x+1)(x-1) → (x+1)*(x-1)
          // 注意：parseUnary 已确保 left 是一个完整的值，所以此处直接判断下一个 token 即可
          const right = parseUnary();
          left = { type: 'BinaryOp', op: '*', left: left, right: right };
        } else {
          break;
        }
      }

      depth--;
      return left;
    }

    function parseUnary() {
      checkDepth();
      depth++;
      const tok = peek();

      if (tok.type === TokenType.OPERATOR && (tok.value === '+' || tok.value === '-')) {
        const op = consume();
        const operand = parseUnary();
        depth--;
        return { type: 'UnaryOp', op: op.value, operand: operand };
      }

      const result = parsePower();
      depth--;
      return result;
    }

    function parsePower() {
      checkDepth();
      depth++;
      const base = parsePrimary();

      if (peek().type === TokenType.OPERATOR && peek().value === '^') {
        consume();
        const exponent = parseUnary();
        depth--;
        return { type: 'BinaryOp', op: '^', left: base, right: exponent };
      }

      depth--;
      return base;
    }

    function parsePrimary() {
      checkDepth();
      depth++;
      const tok = peek();

      if (tok.type === TokenType.NUMBER) {
        consume();
        depth--;
        return { type: 'Number', value: tok.value };
      }

      if (tok.type === TokenType.VARIABLE) {
        consume();
        depth--;
        return { type: 'Variable', name: tok.value };
      }

      if (tok.type === TokenType.PARAM) {
        consume();
        depth--;
        return { type: 'Param', name: tok.value };
      }

      if (tok.type === TokenType.CONSTANT) {
        consume();
        depth--;
        return { type: 'Constant', name: tok.value };
      }

      if (tok.type === TokenType.FUNCTION) {
        const funcName = tok.value;
        consume();
        expect(TokenType.LPAREN, (typeof window !== 'undefined' && window.i18n && window.i18n.t('expr_error_func_lparen')) || '函数调用后必须有左括号');
        const arg = parseExpression();
        expect(TokenType.RPAREN, (typeof window !== 'undefined' && window.i18n && window.i18n.t('expr_error_func_rparen')) || '函数调用后必须有右括号');
        depth--;
        return { type: 'FunctionCall', name: funcName, argument: arg };
      }

      if (tok.type === TokenType.LPAREN) {
        consume();
        const expr = parseExpression();
        expect(TokenType.RPAREN, (typeof window !== 'undefined' && window.i18n && window.i18n.t('expr_error_missing_rparen')) || '缺少右括号');
        depth--;
        return expr;
      }

      throw new Error((typeof window !== 'undefined' && window.i18n && window.i18n.t('expr_error_unexpected_token', {val: (tok.value || tok.type)})) || ('意外的 token: ' + (tok.value || tok.type)));
    }

    return {
      parse: function () {
        const ast = parseExpression();
        if (peek().type !== TokenType.EOF) {
          throw new Error((typeof window !== 'undefined' && window.i18n && window.i18n.t('expr_error_extra_content')) || '表达式有多余内容');
        }
        return ast;
      }
    };
  }

  function evalAst(node, x, params) {
    if (node === null || node === undefined) {
      throw new Error((typeof window !== 'undefined' && window.i18n && window.i18n.t('expr_error_invalid_ast')) || '无效的 AST 节点');
    }
    if (params === undefined || params === null) params = {};

    switch (node.type) {
      case 'Number':
        return node.value;

      case 'Variable':
        if (node.name === 'x') {
          if (typeof x !== 'number') {
            throw new Error((typeof window !== 'undefined' && window.i18n && window.i18n.t('expr_error_x_undefined')) || '变量 x 未定义');
          }
          return x;
        }
        throw new Error((typeof window !== 'undefined' && window.i18n && window.i18n.t('expr_error_unknown_variable', {val: node.name})) || ('未知变量: ' + node.name));

      case 'Param':
        if (params.hasOwnProperty(node.name)) {
          const val = params[node.name];
          if (typeof val !== 'number') {
            throw new Error((typeof window !== 'undefined' && window.i18n && window.i18n.t('expr_error_param_not_number', {val: node.name})) || ('参数 ' + node.name + ' 不是数字'));
          }
          return val;
        }
        throw new Error((typeof window !== 'undefined' && window.i18n && window.i18n.t('expr_error_undefined_param', {val: node.name})) || ('未定义参数: ' + node.name));

      case 'Constant':
        if (CONSTANTS.hasOwnProperty(node.name)) {
          return CONSTANTS[node.name];
        }
        throw new Error((typeof window !== 'undefined' && window.i18n && window.i18n.t('expr_error_unknown_constant', {val: node.name})) || ('未知常量: ' + node.name));

      case 'UnaryOp': {
        const val = evalAst(node.operand, x, params);
        if (node.op === '-') return -val;
        if (node.op === '+') return val;
        throw new Error((typeof window !== 'undefined' && window.i18n && window.i18n.t('expr_error_unknown_unary_op', {val: node.op})) || ('未知一元运算符: ' + node.op));
      }

      case 'BinaryOp': {
        const left = evalAst(node.left, x, params);
        const right = evalAst(node.right, x, params);
        switch (node.op) {
          case '+': return left + right;
          case '-': return left - right;
          case '*': return left * right;
          case '/':
            if (right === 0) throw new Error((typeof window !== 'undefined' && window.i18n && window.i18n.t('expr_error_div_zero')) || '除数不能为零');
            return left / right;
          case '^':
            return Math.pow(left, right);
          default:
            throw new Error((typeof window !== 'undefined' && window.i18n && window.i18n.t('expr_error_unknown_binary_op', {val: node.op})) || ('未知二元运算符: ' + node.op));
        }
      }

      case 'FunctionCall': {
        const arg = evalAst(node.argument, x, params);
        const fn = FUNCTIONS[node.name];
        if (!fn) {
          throw new Error((typeof window !== 'undefined' && window.i18n && window.i18n.t('expr_error_unknown_function', {val: node.name})) || ('未知函数: ' + node.name));
        }
        return fn(arg);
      }

      default:
        throw new Error((typeof window !== 'undefined' && window.i18n && window.i18n.t('expr_error_unknown_ast_type', {val: node.type})) || ('未知 AST 节点类型: ' + node.type));
    }
  }

  function parseExpressionSafe(expr) {
    try {
      const tokens = tokenize(expr);
      const parser = createParser(tokens);
      const ast = parser.parse();
      return { ok: true, ast: ast, error: null };
    } catch (e) {
      return { ok: false, ast: null, error: e.message || ((typeof window !== 'undefined' && window.i18n && window.i18n.t('expr_error_parse')) || '解析错误') };
    }
  }

  function createEvaluator(ast) {
    return function (x, params) {
      return evalAst(ast, x, params);
    };
  }

  function extractParams(ast) {
    const params = {};
    function walk(node) {
      if (!node) return;
      if (node.type === 'Param') {
        params[node.name] = true;
        return;
      }
      if (node.type === 'UnaryOp') {
        walk(node.operand);
      } else if (node.type === 'BinaryOp') {
        walk(node.left);
        walk(node.right);
      } else if (node.type === 'FunctionCall') {
        walk(node.argument);
      }
    }
    walk(ast);
    return Object.keys(params).sort();
  }

  window.ExpressionParser = {
    tokenize: tokenize,
    parse: parseExpressionSafe,
    evalAst: evalAst,
    createEvaluator: createEvaluator,
    extractParams: extractParams,
    FUNCTIONS: FUNCTIONS,
    CONSTANTS: CONSTANTS,
    PARAM_CHARS: PARAM_CHARS,
    TokenType: TokenType,
    MAX_RECURSION_DEPTH: MAX_RECURSION_DEPTH
  };
})();
