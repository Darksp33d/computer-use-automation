export function Icon({
  name,
  size = 18,
}: {
  name: "activity" | "box" | "arrow" | "plus" | "shield" | "check" | "screen";
  size?: number;
}) {
  const paths = {
    activity: "M3 12h4l3-8 4 16 3-8h4",
    box: "m12 3 9 5-9 5-9-5 9-5Zm-9 5v9l9 5 9-5V8M12 13v9",
    arrow: "M5 12h14m-6-6 6 6-6 6",
    plus: "M12 5v14M5 12h14",
    shield: "M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7l-9-4Zm-4 9 3 3 5-6",
    check: "m5 12 4 4L19 6",
    screen: "M3 4h18v13H3V4Zm5 17h8m-4-4v4",
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
