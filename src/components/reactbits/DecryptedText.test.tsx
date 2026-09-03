// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import DecryptedText from "./DecryptedText";

afterEach(() => {
  cleanup();
});

describe("DecryptedText", () => {
  it("keeps one accessible label and does not emit duplicated plaintext", () => {
    const { container } = render(<DecryptedText text="作品集" />);
    expect(container.querySelector("[aria-label='作品集']")).not.toBeNull();
    expect(container.querySelector(".sr-only")).toBeNull();
    expect(container.innerHTML.includes("作品集作品集")).toBe(false);
  });
});
