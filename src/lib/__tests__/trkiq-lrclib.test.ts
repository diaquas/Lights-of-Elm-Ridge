import { describe, it, expect } from "vitest";
import { parseLrc } from "@/lib/trkiq/lrclib-client";

describe("lrclib-client", () => {
  describe("parseLrc", () => {
    it("parses standard LRC format", () => {
      const lrc = [
        "[00:12.34]First line of lyrics",
        "[00:15.67]Second line of lyrics",
        "[00:20.00]Third line",
      ].join("\n");

      const result = parseLrc(lrc);
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        timeMs: 12340,
        text: "First line of lyrics",
      });
      expect(result[1]).toEqual({
        timeMs: 15670,
        text: "Second line of lyrics",
      });
      expect(result[2]).toEqual({
        timeMs: 20000,
        text: "Third line",
      });
    });

    it("handles 3-digit milliseconds", () => {
      const lrc = "[01:30.456]Some text";
      const result = parseLrc(lrc);
      expect(result).toHaveLength(1);
      expect(result[0].timeMs).toBe(90456);
    });

    it("handles 2-digit centiseconds", () => {
      const lrc = "[02:05.50]Half second";
      const result = parseLrc(lrc);
      expect(result).toHaveLength(1);
      expect(result[0].timeMs).toBe(125500);
    });

    it("skips empty lines and non-timestamped lines", () => {
      const lrc = [
        "[00:05.00]Real line",
        "",
        "Not a timestamp line",
        "[00:10.00]Another real line",
        "[00:15.00]",
      ].join("\n");

      const result = parseLrc(lrc);
      expect(result).toHaveLength(2);
      expect(result[0].text).toBe("Real line");
      expect(result[1].text).toBe("Another real line");
    });

    it("handles empty input", () => {
      expect(parseLrc("")).toHaveLength(0);
    });

    it("produces timestamps in ascending order", () => {
      const lrc = [
        "[00:05.00]A",
        "[00:10.00]B",
        "[00:15.00]C",
        "[01:00.00]D",
      ].join("\n");

      const result = parseLrc(lrc);
      for (let i = 1; i < result.length; i++) {
        expect(result[i].timeMs).toBeGreaterThan(result[i - 1].timeMs);
      }
    });

    it("strips leading/trailing whitespace from text", () => {
      const lrc = "[00:01.00]  padded text  ";
      const result = parseLrc(lrc);
      expect(result[0].text).toBe("padded text");
    });
  });
});
