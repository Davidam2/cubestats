import { describe, expect, it } from "vitest";
import { parseTimeInput } from "./parse";

describe("parseTimeInput", () => {
  it("parses plain seconds with decimals", () => {
    expect(parseTimeInput("12.34")).toBe(12340);
    expect(parseTimeInput("0.5")).toBe(500);
    expect(parseTimeInput("9.999")).toBe(9999);
    expect(parseTimeInput("12,34")).toBe(12340); // comma tolerated (es keyboards)
  });

  it("parses m:ss.cc and h:mm:ss", () => {
    expect(parseTimeInput("1:23.45")).toBe(83450);
    expect(parseTimeInput("1:23")).toBe(83000);
    expect(parseTimeInput("1:02:03.45")).toBe(3723450);
  });

  it("rejects seconds >= 60 when minutes are present", () => {
    expect(parseTimeInput("1:63.45")).toBeNull();
    expect(parseTimeInput("1:63:03")).toBeNull();
  });

  it("parses csTimer bare-digit style", () => {
    expect(parseTimeInput("1234")).toBe(12340); // 12.34
    expect(parseTimeInput("12345")).toBe(83450); // 1:23.45
    expect(parseTimeInput("123456")).toBe(754560); // 12:34.56
    expect(parseTimeInput("8")).toBe(80); // 0.08
  });

  it("rejects garbage and non-positive times", () => {
    expect(parseTimeInput("")).toBeNull();
    expect(parseTimeInput("   ")).toBeNull();
    expect(parseTimeInput("abc")).toBeNull();
    expect(parseTimeInput("1:2:3:4")).toBeNull();
    expect(parseTimeInput("0")).toBeNull();
    expect(parseTimeInput("0.000")).toBeNull();
    expect(parseTimeInput("-5")).toBeNull();
  });
});
