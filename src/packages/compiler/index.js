const State = {
  initial: 1, // 初始状态
  tagOpen: 2, // 标签开始状态
  tagName: 3, // 标签名称状态
  text: 4, // 文本状态
  tagEnd: 5, // 结束标签状态
  tagEndName: 6, // 结束标签名称状态
};
/**
 * 词法分析
 * @param str 模版字符串
 * @return 返回Token数组
 */
export function tokenize(str) {
  // 设置当前状态为初始状态
  let currentState = State.initial;
  // 保存token的数组
  const tokens = [];
  // 缓存当前读取的字符
  const chars = [];
  // 当模版字符串读取完毕后退出循环
  while (str) {
    // 读取第一个字符
    const char = str[0];
    // 匹配状态机当前处于哪一个状态
    switch (currentState) {
      case State.initial:
        // 状态机当前处于初始状态
        if (char === "<") {
          // 1. 状态机切换到标签开始状态
          currentState = State.tagOpen;
        } else {
          // 初始状态下碰到其他字符一律当作文本节点处理
          // 1. 切换到文本状态
          currentState = State.text;
          // 2. 将当前读取字符缓存
          chars.push(char);
        }
        // 消费掉该字符
        str = str.slice(1);
        break;
      case State.tagOpen:
        // 状态机当前处于标签开始状态
        // 另外免得有人说我何不食肉糜啥的，我家里以前可穷得很，现在勉强算出头了，但也不是多富了。在亲戚里也变成了有出息的小伙子，这都是我努力来的，不买车纯粹是因为一个在外的打工仔实在用不上。
        if (char === "/") {
          // 切换到结束标签状态
          currentState = State.tagEnd;
        } else {
          // 1. 切换到标签名称状态
          currentState = State.tagName;
          // 2. 缓存当前读取字符
          chars.push(char);
        }
        // 消费掉该字符
        str = str.slice(1);
        break;
      case State.tagName:
        // 状态机当前处于标签名称状态
        if (char === ">") {
          // 1. 遇到字符>，说明标签闭合，切换到初始状态
          currentState = State.initial;
          // 2. 把之前缓存的字符拼接并创建为一个token
          tokens.push({
            type: "tag",
            name: chars.join(""),
          });
          // 3. chars已经被消费了，清空掉
          chars.length = 0;
        } else {
          // 继续缓存当前字符
          chars.push(char);
        }
        // 消费掉该字符
        str = str.slice(1);
        break;
      case State.text:
        // 状态机当前处于文本状态
        if (char === "<") {
          // 1. 遇到<，切换到标签开始状态
          currentState = State.tagOpen;
          // 2. 从文本状态 迁移 到标签开始状态时，表示文本节点字符已收集完毕，创建文本token
          tokens.push({
            type: "text",
            content: chars.join(""),
          });
          // 3. chars已经被消费了，清空掉
          chars.length = 0;
        } else {
          // 缓存当前字符
          chars.push(char);
        }
        // 消费掉该字符
        str = str.slice(1);
        break;
      case State.tagEnd:
        // 状态机当前处于标签结束状态
        // 1. 切换到结束标签名称状态
        currentState = State.tagEndName;
        // 2. 缓存当前字符
        chars.push(char);
        // 3. 消费掉该字符
        str = str.slice(1);
        break;
      case State.tagEndName:
        // 状态机当前处于结束标签名称状态
        if (char === ">") {
          // 1. 标签闭合，切换到初始状态
          currentState = State.initial;
          // 2. 保存标签名称
          tokens.push({
            type: "tagEnd",
            name: chars.join(""),
          });
          // 3. chars已经被消费了，清空掉
          chars.length = 0;
        } else {
          // 缓存当前字符
          chars.push(char);
        }
        // 消费掉该字符
        str = str.slice(1);
        break;
    }
  }
  // 最后返回token数组
  return tokens;
}

/**
 * 根据模版字符串解析AST
 * @param str 模版字符串
 */
export function parse(str) {
  // 解析token
  const tokens = tokenize(str);
  // 创建根节点
  const root = {
    type: "root",
    children: [],
  };
  // 创建 elementStack 栈，起初只有 Root 根节点
  const elementStack = [root]
  // 遍历tokens
  while (tokens.length) {
    const token = tokens[0];
    // 获取当前栈顶节点作为父节点 parent
    const parent = elementStack[elementStack.length - 1]
    switch (token.type) {
      case "tag":
        // 开始标签则创建 Element 类型的AST节点
        const elementNode = {
          type: "Element",
          tag: token.name,
          children: []
        };
        // 将其添加到父级节点的 children 中
        parent.children.push(elementNode);
        // 将当前节点压入栈
        elementStack.push(elementNode);
        break;
      case "text":
        // 创建文本节点
        const textNode = {
          type: "Text",
          content: token.content
        }
        // 将其插入到父节点中
        parent.children.push(textNode)
        break;
      case "tagEnd":
        // 遇到结束标签，弹出栈顶元素
        elementStack.pop();
        break;
    }
    // 消费掉token
    tokens.shift()
  }
  return root
}