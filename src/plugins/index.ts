import ClickToIDE from "./ClickToIDE";

function ClickToIDEBabelPlugin() {
  return {
    name: "click-to-ide-babel-plugin",
    visitor: {
      // 空的访问者函数
    },
  };
}

export default process.env.NODE_ENV === "development"
  ? ClickToIDE
  : ClickToIDEBabelPlugin;
