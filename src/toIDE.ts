function htmlEncode(html: string) {
  var output = "";
  if (html) {
    var temp = document.createElement("div");
    temp.innerText = html;
    output = temp.innerHTML;
  }
  return output;
}

const compute = (popup: HTMLElement, top: number, _bottom: number) => {
  // 获取弹窗宽度和高度
  var popupWidth = popup.offsetWidth;
  var popupHeight = popup.offsetHeight;
  // 获取窗口宽度和高度
  var windowWidth = window.innerWidth;
  var windowHeight = window.innerHeight;
  // 获取弹窗距离窗口左侧和顶部的距离
  var popupLeft = popup.offsetLeft;
  // 判断弹窗是否超出窗口左侧或右侧
  if (popupLeft + popupWidth > windowWidth) {
    // 超出右侧，将弹窗左移
    popup.style.left = windowWidth - popupWidth + "px";
  } else if (popupLeft < 0) {
    // 超出左侧，将弹窗右移
    popup.style.left = "0";
  }

  const bottom = windowHeight - _bottom;

  let topDiff = top - popupHeight - 10;
  let downDiff = bottom - popupHeight - 10;

  if (topDiff < 0) {
    if (downDiff < 0) {
      popup.style.top = 0 + "px";
      if (popupHeight > windowHeight) {
        popup.style.height = windowHeight + "px";
      }
    } else {
      // 上方展示不下，展示下方
      popup.style.top = windowHeight - bottom + 10 + "px";
    }
  } else if (downDiff < 0) {
    // 下方展示不下，展示上
    popup.style.top = top - 10 - popupHeight + "px";
  }
};

function findReact(dom: any) {
  let key = Object.keys(dom).find(
    (key) =>
      key.startsWith("__reactFiber$") ||
      key.startsWith("__reactInternalInstance")
  );
  const internalInstance = key ? dom[key] : null;
  return internalInstance;
}

const getSourceByElement = (element: any, isFiber?: "isFiber") => {
  let fiber = element;
  let fiberType;
  if (isFiber !== "isFiber") {
    fiber = findReact(element);
  }
  if (!fiber) return;
  fiberType =
    typeof fiber.type === "string"
      ? fiber.type
      : (fiber.type?.name || fiber.type?.displayName) ??
        fiber.type?.["$$typeof"]?.toString();

  const line =
    fiber.memoizedProps?.["data-inspector-line"] ||
    fiber._debugSource?.lineNumber;
  const column =
    fiber.memoizedProps?.["data-inspector-column"] ||
    fiber._debugSource?.columnNumber;
  const path =
    fiber.memoizedProps?.["data-inspector-file-path"] ||
    fiber._debugSource?.fileName;
  const displayName = fiber.memoizedProps?.["__displayname"];

  if (!path) return;
  return {
    stateNode: fiber.stateNode,
    originType: fiber.type,
    type:
      displayName ??
      fiberType ??
      element?.tagName?.toLowerCase?.() ??
      "Anonymous",
    path: path ? path.replace(/^.*(src.*)/, "$1") : path,
    originPath: path,
    column,
    line,
  };
};

const findElement = (element: HTMLElement, level = 1) => {
  let remainingLevel = level;
  const rs = [];
  const a = [];
  let currentFiber = findReact(element);
  while (remainingLevel > 0) {
    if (!currentFiber) break;
    const source = getSourceByElement(currentFiber, "isFiber");

    if (!source || !source?.type || !source?.path || source.stateNode) {
      currentFiber = currentFiber.return;
      continue;
    }
    const lastSource = rs[rs.length - 1];
    if (
      lastSource &&
      lastSource.column === source.column &&
      lastSource.line === source.line &&
      lastSource.path === source.path &&
      lastSource.type === source.type
    ) {
      currentFiber = currentFiber.return;
      continue;
    }
    rs.push(source);
    a.push(currentFiber);
    currentFiber = currentFiber.return;
    remainingLevel--;
  }
  return rs;
};

class Store {
  private values: any = {};
  private listeners: any = {};
  subscribe = (name: string, cb: (store: Store) => void) => {
    this.listeners[name] = this.listeners[name] || [];
    this.listeners[name].push(cb);
  };
  unSubscribe = (name: string, cb: (value: any) => void) => {
    this.listeners[name] = this.listeners[name] || [];
    this.listeners[name] = this.listeners[name].filter(
      (item: any) => item !== cb
    );
  };
  set = (name: string, value: any) => {
    this.values[name] = value;
    (this.listeners[name] || []).forEach((cb: any) => cb(this));
  };
  get = (name: string) => {
    return this.values[name];
  };
}

class PopupHandle {
  popupEle: HTMLElement;
  maskEle: HTMLElement;
  contentEle: HTMLElement;
  utils: { jump: (url: string) => void; handleClear: () => void };
  constructor(utils: { jump: (url: string) => void; handleClear: () => void }) {
    this.utils = utils;
  }
  init = (subscribe: typeof Store.prototype.subscribe) => {
    this.addStyle();
    this.addEle(subscribe);
  };
  private addStyle = () => {
    const styleEle = document.createElement("style");
    styleEle.innerHTML = `
  .click-to-ide-popup{
    overflow-y: auto;
    font-size: 16px;
    padding: 5px;
    border-radius: 5px;
    position: fixed;
    background-color: #fff;
    z-index: 10000;
    height: auto;
    min-width: 300px;
    box-sizing: border-box;
    box-shadow: 0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05);
  }
  .click-to-ide-popup .click-to-ide-popup-item{
    cursor: pointer;
    padding: 5px;
    border-radius: 5px;
  }
  .click-to-ide-popup-item>*:first-child{
    color: #456CE2;
    font-weight: bolder;
  }
  .click-to-ide-popup-item>*:first-child>span{
    color: #000;
    opacity: 0.5;
  }
  .click-to-ide-popup-item>*:last-child{
    color: #000;
    font-size: 14px;
    opacity: 0.5;
  }
  .click-to-ide-popup .click-to-ide-popup-item:hover{
    background: #416AE0;
  }
  .click-to-ide-popup .click-to-ide-popup-item:hover>*{
    color: #fff;
  }
  .click-to-ide-popup-hide{
    display: none;
  }
  .click-to-ide-popup-mask{
    position: fixed;
    border: 2px solid lightgreen;
    pointer-events: none;
    z-index: 9999;
  }
`;
    document.head.appendChild(styleEle);
  };
  getContainer = () => {
    return this.contentEle;
  };
  private addEle = (subscribe: typeof Store.prototype.subscribe) => {
    const popupEle = document.createElement("div");
    document.body.appendChild(popupEle);
    this.popupEle = popupEle;

    const maskEle = document.createElement("div");
    maskEle.className = "click-to-ide-popup-mask";
    document.body.appendChild(maskEle);
    this.maskEle = maskEle;
    subscribe("rect", this.updateMask);
    subscribe("target", this.updateMask);

    const contentEle = document.createElement("div");
    contentEle.className = "click-to-ide-popup";
    popupEle.appendChild(contentEle);
    this.contentEle = contentEle;
    subscribe("rect", this.updateContent);
    subscribe("target", this.updateContent);
    subscribe("list", this.updateContent);
    subscribe("canInteract", this.updateContent);
  };
  private updateMask = (store: Store) => {
    const rect = store.get("rect");
    const target = store.get("target");
    const { width, height, top, left } = rect;
    this.popupEle.style.top = `${top + height}px`;
    this.popupEle.style.left = `${left}px`;
    if (!this.maskEle) return;
    this.maskEle.style.top = `${top}px`;
    this.maskEle.style.left = `${left}px`;
    this.maskEle.style.width = `${width}px`;
    this.maskEle.style.height = `${height}px`;
    this.maskEle.style.display =
      target && rect.top !== undefined ? "block" : "none";
  };
  private updateContent = (store: Store) => {
    const rect = store.get("rect");
    const target = store.get("target");
    const list = store.get("list");
    const canInteract = store.get("canInteract");
    const isShow = target && list.length > 0;
    if (isShow) {
      this.contentEle.classList.remove("click-to-ide-popup-hide");
    } else {
      this.contentEle.classList.add("click-to-ide-popup-hide");
    }

    const { height, top, left } = rect;
    this.contentEle.style.top = `${top + height + 10}px`;
    this.contentEle.style.left = `${left}px`;
    this.contentEle.style.pointerEvents = canInteract ? "auto" : "none";

    const fragment = document.createDocumentFragment();
    list.forEach((item: any) => {
      const itemEle = document.createElement("div");
      itemEle.className = "click-to-ide-popup-item";
      itemEle.innerHTML = `
      <div>
        ${item.title}
        <span>${htmlEncode(item.subTitle)}</span>
      </div>
      <div>${item.description}</div>
      `;
      itemEle.onclick = () => {
        this.utils.jump(item.jumpUrl);
        this.utils.handleClear();
      };
      fragment.appendChild(itemEle);
    });
    this.contentEle.innerHTML = "";
    this.contentEle.appendChild(fragment);
  };
}

class ClickToIDE {
  store: Store;
  domHandle: PopupHandle;
  constructor(store: Store) {
    this.store = store;
    this.domHandle = new PopupHandle({
      jump: this.jump.bind(this),
      handleClear: this.handleClear.bind(this),
    });
    this.handleClear();
  }
  init() {
    this.domHandle.init(this.store.subscribe);
    this.registerEvent();
    this.store.subscribe("showAll", this.changeList);
    this.store.subscribe("target", this.changeList);

    this.store.subscribe("list", this.compute);
    this.store.subscribe("rect", this.compute);
    this.store.subscribe("target", this.changePopupStyle);
  }

  clear() {
    // clear store
    this.handleClear();

    // clear event
    document.removeEventListener("keydown", this.onKeyDown);
    document.removeEventListener("keyup", this.onKeyUp);
    document.removeEventListener("mousemove", this.onMouseMove, {
      capture: true,
    });
    document.removeEventListener("contextmenu", this.onContextMenu, {
      capture: true,
    });
    this.removeOnClick();
  }

  changeList = () => {
    const target = this.store.get("target");
    const showAll = this.store.get("showAll");
    if (target) {
      const rect = target.getBoundingClientRect();
      const rs = findElement(target, showAll ? +Infinity : 1);

      // if (!source) return;
      if (rs.length === 0) return;
      this.store.set("rect", rect);
      const targetTag = target.tagName.toLowerCase();
      // console.log("rs: ", rs);
      // const mergedRs = rs;
      let newList = [];
      if (rs.length < 1) return;
      const { column, line, originPath, path, type } = rs[0];
      const firstItem = [
        {
          title: targetTag,
          subTitle: `in <${type}>`,
          description: `${path}:${line}:${column}`,
          jumpUrl: `${originPath}:${line}:${column}`,
        },
      ];
      const others = rs.map((item, index) => {
        let o = item;
        // if (index === 0 && source?.path) {
        //   o = source;
        //   o.type = item.type;
        // }
        const { column, line, originPath, path, type } = o;
        const { type: parentType } = rs[index + 1] ?? {};
        return {
          title: type,
          subTitle: parentType ? `in <${parentType}>` : "",
          description: `${path}:${line}:${column}`,
          jumpUrl: `${originPath}:${line}:${column}`,
        };
      });
      newList = showAll ? [...firstItem, ...others] : firstItem;
      if (newList.length < 1) return;
      this.store.set("list", newList);
    }
  };

  compute = () => {
    const popup = this.domHandle.getContainer();
    if (!popup) return;
    const rect = this.store.get("rect");
    compute(this.domHandle.getContainer(), rect.top, rect.bottom);
  };

  changePopupStyle = () => {
    const popup = this.domHandle.getContainer();
    if (!popup) return;
    popup.style.height = "auto";
  };

  registerEvent = () => {
    document.addEventListener("keydown", this.onKeyDown);
    document.addEventListener("keyup", this.onKeyUp);
  };
  onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Alt") {
      this.handleClear();
      this.store.set("isAlt", true);
      document.addEventListener("mousemove", this.onMouseMove, {
        capture: true,
      });
      document.addEventListener("contextmenu", this.onContextMenu, {
        capture: true,
      });
      document.addEventListener("click", this.onClick, { capture: true });
    } else if (e.key === "Escape") {
      this.handleClear();
    } else if (this.store.get("isAlt") === true) {
      this.handleClear();
    }
  };
  onKeyUp = (e: KeyboardEvent) => {
    if (e.key === "Alt") {
      if (!this.store.get("showAll")) {
        this.handleClear();
      }
      document.removeEventListener("mousemove", this.onMouseMove, {
        capture: true,
      });
      if (!this.store.get("showAll")) {
        this.removeOnClick();
      }
      document.removeEventListener("contextmenu", this.onContextMenu, {
        capture: true,
      });
    }
  };

  onMouseMove = (e: any) => {
    const { target } = e;
    if (!target) return;
    if (this.domHandle.getContainer()?.contains(target)) {
      return;
    }
    if (this.store.get("target") !== target) {
      this.store.set("target", target);
    }
  };

  onContextMenu = (e: any) => {
    e.preventDefault();
    this.store.set("canInteract", true);
    this.store.set("showAll", true);
    (document.body.style.marginRight =
      window.innerWidth - document.body.clientWidth + "px"),
      (document.body.style.overflow = "hidden");
    document.removeEventListener("mousemove", this.onMouseMove, {
      capture: true,
    });
    document.removeEventListener("contextmenu", this.onContextMenu, {
      capture: true,
    });
  };

  onClick = (e: any) => {
    if (this.store.get("showAll")) {
      // 点击弹窗外部，关闭弹窗
      if (!this.domHandle.getContainer()?.contains(e.target)) {
        this.handleClear();
        this.removeOnClick();
        document.removeEventListener("mousemove", this.onMouseMove, {
          capture: true,
        });
      }
      return;
    }
    e.stopPropagation();
    e.preventDefault();
    if (this.store.get("list").length === 0) return;
    const url = this.store.get("list")[0].jumpUrl;
    this.jump(url);
    this.handleClear();
    document.removeEventListener("mousemove", this.onMouseMove, {
      capture: true,
    });
    this.removeOnClick();
  };

  removeOnClick = () => {
    document.removeEventListener("click", this.onClick, { capture: true });
  };

  handleClear() {
    this.store.set("target", null);
    this.store.set("rect", {});
    this.store.set("list", []);
    this.store.set("isAlt", false);
    this.store.set("showAll", false);
    this.store.set("canInteract", false);
    document.body.style.overflow = "auto";
    document.body.style.marginRight = 0 + "px";
  }

  jump(url: string) {
    this.removeOnClick();
    const openVsCodeUrl = `vscode://file${url}`;
    window.open(openVsCodeUrl);
  }
}

try {
  // @ts-ignore
  if (!window.__CLICK_TO_IDE__SHOW) {
    const store = new Store();

    const clickToIDE = new ClickToIDE(store);
    clickToIDE.init();
    // @ts-ignore
    window.__CLICK_TO_IDE__SHOW = clickToIDE;
  } else {
    // @ts-ignore
    window.__CLICK_TO_IDE__SHOW.clear();
    // @ts-ignore
    window.__CLICK_TO_IDE__SHOW = undefined;
  }
} catch (error) {
  console.log("ClickToIDE error: ", error);
}
