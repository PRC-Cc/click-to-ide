import React, { useCallback, useRef, useState, useEffect } from "react";

if (typeof Object.assign != "function") {
  Object.assign = function (target: any) {
    // .length of function is 2
    "use strict";
    if (target == null) {
      // TypeError if undefined or null
      throw new TypeError("Cannot convert undefined or null to object");
    }

    var to = Object(target);

    for (var index = 1; index < arguments.length; index++) {
      var nextSource = arguments[index];

      if (nextSource != null) {
        // Skip over if undefined or null
        for (var nextKey in nextSource) {
          // Avoid bugs when hasOwnProperty is shadowed
          if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
            to[nextKey] = nextSource[nextKey];
          }
        }
      }
    }
    return to;
  };
}

function findReact(dom: any) {
  let key = Object.keys(dom).find((key) => key.startsWith("__reactFiber$") || key.startsWith("__reactInternalInstance"));
  const internalInstance = key ? dom[key] : null;
  return internalInstance;
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
      : fiber.type?.name || fiber.type?.displayName;

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

const useNewRef = <T,>(a: T, immediate = true) => {
  const aRef = useRef<T>(a);
  if (immediate) {
    aRef.current = a;
  }
  useEffect(() => {
    if (!immediate) {
      aRef.current = a;
    }
  }, [a, immediate]);

  return aRef;
};

const ClickToIDE = () => {
  const [rect, setRect] = useState<any>({});
  const [list, setList] = useState<
    { description: string; title: string; subTitle: string; jumpUrl: string }[]
  >([]);
  const listRef = useNewRef(list);
  const [target, setTarget] = useState<HTMLElement>();
  const [showAll, setShowAll] = useState(false);
  const showAllRef = useNewRef(showAll);
  const popupRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canInteractRef = useRef(false);
  const isAltRef = useRef(false);

  useEffect(() => {
    if (target) {
      const rect = target.getBoundingClientRect();
      let currentFiber = findReact(target);
      const source = getSourceByElement(currentFiber, "isFiber");
      const rs = findElement(target, showAll ? +Infinity : 1);
      if (rs.length === 0) return;
      setRect(rect);
      const targetTag = target.tagName.toLowerCase();
      const newList = rs.map((item, index) => {
        let o = item;
        if (index === 0 && source?.path) {
          o = source;
          o.type = item.type;
        }
        const { column, line, originPath, path, type } = o;
        const { type: parentType } = rs[index + 1] ?? {};
        return {
          title: index === 0 ? targetTag : type,
          subTitle:
            index === 0
              ? `in <${type}>`
              : parentType
              ? `in <${parentType}>`
              : "",
          description: `${path}:${line}:${column}`,
          jumpUrl: `${originPath}:${line}:${column}`,
        };
      });
      setList(newList);
    }
  }, [showAll, target]);

  useEffect(() => {
    if (!popupRef.current) return;
    if (!popupRef.current) return;
    compute(popupRef.current, rect.top, rect.bottom);
  }, [list, rect.bottom, rect.height, rect.top]);

  const jump = useCallback((url: string) => {
    const openVsCodeUrl = `vscode://file${url}`;
    window.open(openVsCodeUrl);
  }, []);

  const handleClear = useCallback(() => {
    setRect({});
    setList([]);
    setTarget(undefined);
    document.body.style.overflow = "auto";
    document.body.style.marginRight = 0 + "px";
    isAltRef.current = false;
  }, []);

  useEffect(() => {
    if (!popupRef.current) return;
    popupRef.current.style.height = "auto";
  }, [target]);

  const onMouseMove = useCallback((e: any) => {
    const { target } = e;
    if (!target) return;
    if (containerRef.current?.contains(target)) {
      return;
    }
    setTarget((_target) => (target === _target ? _target : target));
  }, []);

  const onClick = useCallback(
    (e: any) => {
      if (showAllRef.current) {
        // 点击弹窗外部，关闭弹窗
        if (!popupRef.current?.contains(e.target)) {
          handleClear();
          document.removeEventListener("click", onClick, { capture: true });
          document.removeEventListener("mousemove", onMouseMove, {
            capture: true,
          });
        }
        return;
      }
      e.stopPropagation();
      e.preventDefault();
      if (listRef.current.length === 0) return;
      const url = listRef.current[0].jumpUrl;
      jump(url);
      handleClear();
      document.removeEventListener("mousemove", onMouseMove, { capture: true });
      document.removeEventListener("click", onClick, { capture: true });
    },
    [handleClear, jump, listRef, onMouseMove, showAllRef]
  );

  const onContextMenu = useCallback((e: any) => {
    e.preventDefault();
    setShowAll(true);
    canInteractRef.current = true;
    Object.assign(document.body.style, {
      marginRight: window.innerWidth - document.body.clientWidth + "px",
      overflow: "hidden",
    });
    document.removeEventListener("mousemove", onMouseMove, {
      capture: true,
    });
    document.removeEventListener("contextmenu", onContextMenu, {
      capture: true,
    });
  }, []);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Alt") {
        handleClear();
        setShowAll(false);
        canInteractRef.current = false;

        isAltRef.current = true;
        document.addEventListener("mousemove", onMouseMove, { capture: true });
        document.addEventListener("contextmenu", onContextMenu, {
          capture: true,
        });
        document.addEventListener("click", onClick, { capture: true });
      } else if (e.key === "Escape") {
        handleClear();
      } else if (isAltRef.current === true) {
        handleClear();
      }
    },
    [onMouseMove, onContextMenu, onClick, handleClear]
  );

  const onKeyUp = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Alt") {
        if (!showAllRef.current) {
          handleClear();
        }
        document.removeEventListener("mousemove", onMouseMove, {
          capture: true,
        });
        if (!showAllRef.current) {
          document.removeEventListener("click", onClick, { capture: true });
        }
        document.removeEventListener("contextmenu", onContextMenu, {
          capture: true,
        });
      }
    },
    [showAllRef, onMouseMove, onContextMenu, handleClear, onClick]
  );

  useEffect(() => {
    document.addEventListener("keydown", onKeyDown);

    document.addEventListener("keyup", onKeyUp);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
    };
  }, [onMouseMove, onKeyDown, onKeyUp]);

  return (
    <div ref={containerRef}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .click-to-ide-popup{
          overflow-y: auto;
          font-size: 16px;
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
        `,
        }}
      ></style>
      <div
        style={{
          position: "fixed",
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          border: "2px solid lightgreen",
          pointerEvents: "none",
          zIndex: 9999,
          display: target && rect.top !== undefined ? "block" : "none",
        }}
      ></div>
      {target && list.length > 0 && (
        <div
          ref={popupRef}
          className="click-to-ide-popup"
          style={{
            padding: 5,
            borderRadius: 5,
            position: "fixed",
            left: rect.left,
            top: rect.top + rect.height + 10,
            backgroundColor: "#fff",
            zIndex: 10000,
            height: "auto",
            minWidth: 300,
            pointerEvents: canInteractRef.current ? "auto" : "none",
            boxSizing: "border-box",
            boxShadow:
              "0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)",
          }}
        >
          {list.map((item, index) => {
            return (
              <div
                key={index}
                className="click-to-ide-popup-item"
                onClick={() => {
                  jump(item.jumpUrl);
                  handleClear();
                }}
              >
                <div>
                  {item.title} <span>{item.subTitle}</span>
                </div>
                <div>{item.description}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ClickToIDE;
