import { describe, it, expect, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTheme, useThemeStore } from "./themeStore";

afterEach(() => {
  act(() => {
    useThemeStore.getState().resetTheme();
  });
});

describe("themeStore", () => {
  it("updates theme via hook", () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme("neon");
    });

    expect(result.current.theme).toBe("neon");
  });

  it("resets theme to default", () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme("retro");
      result.current.resetTheme();
    });

    expect(result.current.theme).toBe("magic");
  });
});
