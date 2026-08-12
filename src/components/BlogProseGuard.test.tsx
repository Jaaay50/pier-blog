// @vitest-environment jsdom

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BlogProseGuard } from "./BlogProseGuard";
import { NextIntlClientProvider } from "next-intl";

const messages = {
  blog: {
    copyRestricted: "正文复制已限制，代码块与链接仍可复制",
  },
};

function renderGuarded(children: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="zh" messages={messages}>
      <BlogProseGuard>{children}</BlogProseGuard>
    </NextIntlClientProvider>,
  );
}

// Polyfill ClipboardEvent for jsdom
if (typeof ClipboardEvent === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).ClipboardEvent = class ClipboardEvent extends Event {
    constructor(type: string, options?: EventInit) {
      super(type, options);
    }
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  window.getSelection()?.removeAllRanges();
  vi.useRealTimers();
});

describe("BlogProseGuard", () => {
  it("阻止受保护正文的复制事件并显示提示", async () => {
    renderGuarded(<p>受保护的正文段落</p>);

    const paragraph = screen.getByText("受保护的正文段落");
    const copyEvent = new ClipboardEvent("copy", { bubbles: true, cancelable: true });
    const preventDefaultSpy = vi.spyOn(copyEvent, "preventDefault");

    // 模拟选择正文
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    selection?.removeAllRanges();
    selection?.addRange(range);

    await act(async () => {
      paragraph.dispatchEvent(copyEvent);
    });

    expect(preventDefaultSpy).toHaveBeenCalled();
    const toast = screen.getByRole("status");
    expect(toast.textContent).toBe("正文复制已限制，代码块与链接仍可复制");

    // 2 秒后 toast 消失
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("允许代码块内容被选择和复制", async () => {
    renderGuarded(
      <pre>
        <code>const example = true;</code>
      </pre>,
    );

    const code = screen.getByText("const example = true;");
    const copyEvent = new ClipboardEvent("copy", { bubbles: true, cancelable: true });
    const preventDefaultSpy = vi.spyOn(copyEvent, "preventDefault");

    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(code);
    selection?.removeAllRanges();
    selection?.addRange(range);

    await act(async () => {
      code.dispatchEvent(copyEvent);
    });

    // 代码块内容应该放行
    expect(preventDefaultSpy).not.toHaveBeenCalled();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("允许链接被右键点击", async () => {
    renderGuarded(
      <p>
        访问 <a href="https://example.com">示例链接</a> 了解更多
      </p>,
    );

    const link = screen.getByText("示例链接");
    const contextMenuEvent = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
    });
    const preventDefaultSpy = vi.spyOn(contextMenuEvent, "preventDefault");

    await act(async () => {
      link.dispatchEvent(contextMenuEvent);
    });

    // 链接右键应该放行
    expect(preventDefaultSpy).not.toHaveBeenCalled();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("阻止受保护正文的右键菜单并显示提示", async () => {
    renderGuarded(<p>受保护段落</p>);

    const paragraph = screen.getByText("受保护段落");
    const contextMenuEvent = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
    });
    const preventDefaultSpy = vi.spyOn(contextMenuEvent, "preventDefault");

    await act(async () => {
      paragraph.dispatchEvent(contextMenuEvent);
    });

    expect(preventDefaultSpy).toHaveBeenCalled();
    const toast = screen.getByRole("status");
    expect(toast.textContent).toBe("正文复制已限制，代码块与链接仍可复制");
  });

  it("允许表单元素被选择", async () => {
    renderGuarded(
      <div>
        <input type="text" defaultValue="可编辑输入框" />
        <textarea defaultValue="可编辑文本区域" />
        <button>可点击按钮</button>
      </div>,
    );

    const input = screen.getByDisplayValue("可编辑输入框");
    const copyEvent = new ClipboardEvent("copy", { bubbles: true, cancelable: true });
    const preventDefaultSpy = vi.spyOn(copyEvent, "preventDefault");

    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(input);
    selection?.removeAllRanges();
    selection?.addRange(range);

    await act(async () => {
      input.dispatchEvent(copyEvent);
    });

    // 表单元素应该放行
    expect(preventDefaultSpy).not.toHaveBeenCalled();
  });

  it("允许 data-copy-allow 标记的区域复制", async () => {
    renderGuarded(
      <div>
        <p>受保护段落</p>
        <div data-copy-allow>允许复制的特殊区域</div>
      </div>,
    );

    const allowedDiv = screen.getByText("允许复制的特殊区域");
    const copyEvent = new ClipboardEvent("copy", { bubbles: true, cancelable: true });
    const preventDefaultSpy = vi.spyOn(copyEvent, "preventDefault");

    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(allowedDiv);
    selection?.removeAllRanges();
    selection?.addRange(range);

    await act(async () => {
      allowedDiv.dispatchEvent(copyEvent);
    });

    // data-copy-allow 区域应该放行
    expect(preventDefaultSpy).not.toHaveBeenCalled();
  });

  it("阻止混合选择（部分受保护 + 部分允许）", async () => {
    renderGuarded(
      <div>
        <p id="protected">受保护文本</p>
        <a href="#" id="link">
          链接文本
        </a>
      </div>,
    );

    const protectedP = document.getElementById("protected")!;
    const link = document.getElementById("link")!;
    const copyEvent = new ClipboardEvent("copy", { bubbles: true, cancelable: true });
    const preventDefaultSpy = vi.spyOn(copyEvent, "preventDefault");

    // 模拟从受保护段落选择到链接的混合选择
    const selection = window.getSelection();
    const range = document.createRange();
    range.setStartBefore(protectedP.firstChild!);
    range.setEndAfter(link.lastChild!);
    selection?.removeAllRanges();
    selection?.addRange(range);

    await act(async () => {
      protectedP.dispatchEvent(copyEvent);
    });

    // 混合选择应该被阻止
    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(screen.getByRole("status")).not.toBeNull();
  });

  it("连续触发时重新计时 toast 显示时长", async () => {
    renderGuarded(<p>受保护段落</p>);

    const paragraph = screen.getByText("受保护段落");
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    selection?.removeAllRanges();
    selection?.addRange(range);

    // 第一次触发
    await act(async () => {
      const copyEvent1 = new ClipboardEvent("copy", { bubbles: true, cancelable: true });
      paragraph.dispatchEvent(copyEvent1);
    });

    expect(screen.getByRole("status")).not.toBeNull();

    // 1 秒后再次触发
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
      const copyEvent2 = new ClipboardEvent("copy", { bubbles: true, cancelable: true });
      paragraph.dispatchEvent(copyEvent2);
    });

    // toast 仍然可见
    expect(screen.getByRole("status")).not.toBeNull();

    // 再过 1 秒（总共 2 秒，但第二次触发重置了计时器）
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    // toast 仍然可见（因为重置后还没到 2 秒）
    expect(screen.getByRole("status")).not.toBeNull();

    // 再过 1 秒，toast 应该消失
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("应用 prose-guarded 类到正文容器", () => {
    renderGuarded(<p>内容</p>);
    const container = document.querySelector(".prose-guarded");
    expect(container).not.toBeNull();
    expect(container?.classList.contains("prose")).toBe(true);
    expect(container?.classList.contains("max-w-none")).toBe(true);
  });

  it("toast 具有正确的无障碍属性", async () => {
    renderGuarded(<p>受保护段落</p>);

    const paragraph = screen.getByText("受保护段落");
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    selection?.removeAllRanges();
    selection?.addRange(range);

    await act(async () => {
      const copyEvent = new ClipboardEvent("copy", { bubbles: true, cancelable: true });
      paragraph.dispatchEvent(copyEvent);
    });

    const toast = screen.getByRole("status");
    expect(toast.getAttribute("aria-live")).toBe("polite");
  });
});
