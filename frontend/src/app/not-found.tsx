import {
  FileQuestion,
} from "lucide-react";

export default function NotFound() {
  return (
    <main
      className="
        flex min-h-screen
        items-center
        justify-center
        bg-[#f7f7fb]
        px-5
      "
    >
      <section
        className="
          w-full max-w-[600px]
          rounded-[28px]
          border
          border-black/[0.06]
          bg-white
          p-8
          text-center
          shadow-[0_24px_80px_rgba(30,25,55,0.08)]
        "
      >
        <div
          className="
            mx-auto flex
            size-14
            items-center
            justify-center
            rounded-[18px]
            bg-[#efedff]
            text-[#6657f5]
          "
        >
          <FileQuestion
            className="size-6"
          />
        </div>

        <div
          className="
            mt-5
            text-[10px]
            font-bold
            uppercase
            tracking-[0.1em]
            text-[#aaa6b4]
          "
        >
          404
        </div>

        <h1
          className="
            mt-2
            text-[30px]
            font-bold
            tracking-[-0.045em]
            text-[#171522]
          "
        >
          Page not found
        </h1>

        <p
          className="
            mx-auto mt-3
            max-w-[430px]
            text-sm
            leading-6
            text-[#777486]
          "
        >
          The requested page does not exist
          or is no longer available.
        </p>
      </section>
    </main>
  );
}