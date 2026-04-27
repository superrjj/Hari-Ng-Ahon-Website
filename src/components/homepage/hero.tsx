import { Link } from 'react-router-dom'

export function Hero() {
  return (
    <div className="bg-[#131313] text-[#e5e2e1]">
      <section className="relative flex min-h-[calc(100svh-5rem)] items-center overflow-hidden border-b border-[#464932] px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <img
          src="/bg2.png"
          alt="Hero race"
          className="absolute inset-0 h-full w-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-linear-to-t from-[#131313]/70 via-[#131313]/45 to-transparent" />

        <div className="relative z-10 mx-auto w-full max-w-7xl">
          <p className="inline-block bg-[#cfae3f] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-black sm:px-4 sm:py-2 sm:text-xs">
            Bike Challenge Series
          </p>
          <h1 className="mt-5 max-w-5xl text-3xl font-black uppercase leading-[1.05] sm:mt-6 sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl">
            Hari ng Ahon:
            <br />
            <span className="bg-linear-to-r from-[#cfae3f] to-white bg-clip-text text-transparent">
              Lions Head & Burham Park
            </span>
          </h1>
          <p className="mt-5 max-w-xl border-l-2 border-[#d4f000] pl-4 text-sm leading-relaxed text-[#c6c9ab] sm:mt-6 sm:max-w-2xl sm:pl-6 sm:text-base lg:text-lg">
            The ultimate test of endurance and power. Conquer the legendary ascents of Baguio City and cement your
            legacy in the most grueling high-altitude cycling race in the Philippines.
          </p>
          <div className="mt-7 flex flex-wrap gap-3 sm:mt-8 sm:gap-4">
            <Link
              to="/register/info"
              className="w-full border-2 border-[#cfae3f] bg-[#cfae3f] px-5 py-3 text-center text-[11px] font-bold uppercase tracking-[0.15em] text-black transition-colors hover:bg-[#e2bf4e] sm:w-auto sm:px-8 sm:py-4 sm:text-xs"
            >
              Register Now
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
