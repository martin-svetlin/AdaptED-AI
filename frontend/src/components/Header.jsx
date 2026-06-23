import { Link } from "react-router-dom";

function Header() {
  return (
    <header className="bg-slate-900 text-white shadow-md">

      <div className="h-27 w-full px-12 flex items-center justify-between">

        <button className="text-4xl hover:text-cyan-400 transition-colors">
          ☰
        </button>

        <Link
  to="/"
  className="flex items-center gap-3 hover:opacity-80 transition-opacity"
>

  <span className="text-4xl">
    🎓
  </span>

  <h1 className="text-5xl font-bold">
    Adapt
    <span className="text-orange-400">
      ED
    </span>
    {" "}AI
  </h1>

</Link>

        <button
          className="
            w-14
            h-14
            rounded-full
            bg-slate-100
            hover:bg-slate-700
            text-xl
            transition-colors
          "
        >
          👤
        </button>

      </div>

    </header>
  );
}

export default Header;