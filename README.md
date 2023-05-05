## click-to-ide

用于审查元素后跳转 IDE。适用于 webpack + babel + react + vscode。

### 集成

1. 安装

```sh
npm install click-to-ide --save-dev
```

2. 配置 babel（生产环境不生效）

```diff
+ plugins: ["click-to-ide/plugins"]
```

3. 引入组件（生产环境不生效，可 tree shaking）

```diff
import ClickToIDE from "click-to-ide";
return <>
+     <ClickToIDE/>
</>
```

### 操作

1. alt/option + 左键 => 查看单一节点信息
2. alt/option + 右键 => 查看多节点信息
