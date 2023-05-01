import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useLayoutEffect,
} from "react";

function findReact(dom: any) {
  let key = Object.keys(dom).find((key) => key.startsWith("__reactFiber$"));
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

  let topDiff = popupHeight - top - 10;
  let downDiff = popupHeight - bottom - 10;

  if (topDiff > 0) {
    if (downDiff > 0) {
      // 两者都展示不下，展示 diff 小的，并设置固定高度
      let newTop;
      let newHeight;
      if (topDiff > downDiff) {
        // 展示下方
        newTop = windowHeight - bottom + 10 + "px";
        newHeight = bottom - 10 + "px";
      } else {
        newTop = 0 + "px";
        newHeight = top - 10 + "px";
      }
      popup.style.top = newTop;
      popup.style.height = newHeight;
    } else {
      // 上方展示不下，展示下方
      popup.style.top = windowHeight - bottom + 10 + "px";
    }
  } else if (downDiff > 0) {
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

  const line = fiber.memoizedProps?.["data-inspector-line"];
  const column = fiber.memoizedProps?.["data-inspector-column"];
  const path = fiber.memoizedProps?.["data-inspector-file-path"];
  const displayName = fiber.memoizedProps?.["__displayName"];

  if (!path) return;
  return {
    stateNode: fiber.stateNode,
    originType: fiber.type,
    type: displayName ?? fiberType ?? element?.tagName?.toLowerCase?.(),
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
    { description: string; title: string; jumpUrl: string }[]
  >([]);
  const listRef = useNewRef(list);
  const [target, setTarget] = useState<HTMLElement>();
  const [showAll, setShowAll] = useState(false);
  const showAllRef = useNewRef(showAll);
  const popupRef = useRef<HTMLDivElement>(null);

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
        return {
          title: index === 0 ? `${targetTag} in <${type}>` : type,
          description: `${path}:${line}:${column}`,
          jumpUrl: `${originPath}:${line}:${column}`,
        };
      });
      setList(newList);
    }
  }, [showAll, target]);

  useLayoutEffect(() => {
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
  }, []);

  const onMouseMove = useCallback((e: any) => {
    const { target } = e;
    if (!target) return;
    setTarget((_target) => (target === _target ? _target : target));
  }, []);

  const onClick = useCallback(
    (e: any) => {
      if (showAllRef.current) {
        // 点击弹窗外部，关闭弹窗
        if (!popupRef.current?.contains(e.target)) {
          setRect({});
          setTarget(undefined);
          setList([]);
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
  }, []);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Alt") {
        handleClear();
        setShowAll(false);
        document.addEventListener("mousemove", onMouseMove, { capture: true });
        document.addEventListener("contextmenu", onContextMenu, {
          capture: true,
        });
        document.addEventListener("click", onClick, { capture: true });
      } else if (e.key === "Escape") {
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
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .click-to-ide-popup{
          overflow-y: auto;
        }
        .click-to-ide-popup .item{
          cursor: pointer;
          padding: 5px;
          border-radius: 5px;
        }
        .click-to-ide-popup .item:hover{
          background: aliceblue;
        }
        `,
        }}
      ></style>
      <div
        className="click-to-ide-line"
        style={{
          position: "fixed",
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          border: "1px solid red",
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
            backgroundColor: "#ccc",
            zIndex: 9999,
            height: "auto",
            minWidth: 300,
          }}
        >
          {list.map((item, index) => {
            return (
              <div
                key={index}
                className="item"
                onClick={() => {
                  jump(item.jumpUrl);
                  setRect({});
                  setList([]);
                  setTarget(undefined);
                }}
              >
                <div>{item.title}</div>
                <div>{item.description}</div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

export default ClickToIDE;
