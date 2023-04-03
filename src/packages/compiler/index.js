const State = {
  initial: 1, // 初始状态
  tagOpen: 2, // 标签开始状态
  tagName: 3, // 标签名称状态
  text: 4, // 文本状态
  tagEnd: 5, // 结束标签状态
  tagEndName: 6, // 结束标签名称状态
};
/**
 * @param str 模版字符串
 * @return 返回Token数组
 */
function tokenize(str) {
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
        if (char === '<') {
          // 1. 状态机切换到标签开始状态 
          currentState = State.tagOpen 
        } else {
          // 初始状态下碰到其他字符一律当作文本节点处理
          // 1. 切换到文本状态
          currentState = State.text
          // 2. 将当前读取字符缓存
          chars.push(char)
        }
        // 消费掉该字符
        str = str.slice(1)
        break;
      case State.tagOpen:
        // 状态机当前处于标签开始状态
        if(char === '/') {
          // 切换到结束标签状态
          currentState = State.tagEnd
        } else {
          // 1. 切换到标签名称状态
          currentState = State.tagName
          // 2. 缓存当前读取字符
          chars.push(char)
        }
        // 消费掉该字符
        str = str.slice(1)
        break;
      case State.tagName:
        // 状态机当前处于标签名称状态
        if (char === '>') {
          // 1. 遇到字符>，说明标签闭合，切换到初始状态
          currentState = State.initial
          // 2. 把之前缓存的字符拼接并创建为一个token
          tokens.push({
            type: 'tag',
            content: chars.join('')
          })
          // 3. chars已经被消费了，清空掉
          chars.length = 0
        } else {
          // 继续缓存当前字符
          chars.push(char)
        }
        // 消费掉该字符
        str = str.slice(1)
        break;
      case State.text:
        // 状态机当前处于文本状态
        if (char === '<') {
          // 1. 遇到<，切换到标签开始状态
          currentState = State.tagOpen
          // 2. 从文本状态 迁移 到标签开始状态时，表示文本节点字符已收集完毕，创建文本token
          tokens.push({
            tag: "text",
            content: chars.join('')
          })
          // 3. chars已经被消费了，清空掉
          chars.length = 0
        } else {
          // 缓存当前字符
          chars.push(char)
        }
        // 消费掉该字符
        str = str.slice(1)
        break;
      case State.tagEnd:
        // 状态机当前处于标签结束状态
        // 1. 切换到结束标签名称状态
        currentState = State.tagEndName
        // 2. 缓存当前字符
        chars.push(char)
        // 3. 消费掉该字符
        str = str.slice(1)
        break;
      case State.tagEndName:
        // 状态机当前处于结束标签名称状态
        if(char === ">") {
          // 1. 标签闭合，切换到初始状态
          currentState = State.initial
          // 2. 保存标签名称
          tokens.push({
            type: 'tagEnd',
            content: chars.join('')
          })
          // 3. chars已经被消费了，清空掉
          chars.length = 0
        } else {
          // 缓存当前字符
          chars.push(char)
        }
        // 消费掉该字符
        str = str.slice(1)
        break;
    }
  }
  // 最后返回token数组
  return tokens;
}