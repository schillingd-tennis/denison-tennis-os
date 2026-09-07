import Image from "next/image";

export default function ItaLogoMark({ size = "tab" }: { size?: "tab" | "heading" }) {
  const heading = size === "heading";
  return (
    <span
      className={[
        "inline-flex shrink-0 items-center justify-center overflow-hidden",
        heading ? "h-8 w-11" : "h-5 w-7",
      ].join(" ")}
    >
      <Image
        src="/school-logos/ITA_New_Logo.png"
        alt="ITA"
        width={heading ? 44 : 28}
        height={heading ? 32 : 20}
        className="h-full w-full object-contain"
      />
    </span>
  );
}
