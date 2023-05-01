import ClickToIDE from "./ClickToIDE";

let component: typeof ClickToIDE | (() => null) = () => null;
if (process.env.NODE_ENV === "development") {
  component = ClickToIDE;
}

export default component;
