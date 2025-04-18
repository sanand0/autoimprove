# Auto Improve

<section data-target="#introduction">

What if you _keep_ ask an LLM `Improve the code - dramatically!`?

We used the new [GPT 4.1 Nano](https://platform.openai.com/docs/models/gpt-4.1-nano), a fast, cheap, and capable model, to write code for _simple_ tasks like <q>Draw a circle</q>.

The we fed the output back and asked again, `Improve the code - dramatically!`

Here are the results.

</section>

[![Screenshot](screenshot.webp)](https://sanand0.github.io/autoimprove/)

<section data-target="#observations">

- [`Draw a circle`](https://sanand0.github.io/autoimprove/#apps/circle.json) rose from a fixed circle to a full tool: drag it around, tweak its size and hue, and hit “Reset” to start fresh.
- [`Animate shapes and patterns`](https://sanand0.github.io/autoimprove/#apps/shapes.json) turned simple circles and squares into a swarm of colored polygons that spin, pulse, and link up by distance.
- [`Draw a fully functional analog clock`](https://sanand0.github.io/autoimprove/#apps/clock.json) grew from a bare face to one that builds all 60 tick marks in code—no manual copy‑paste needed.
- [`Create an interactive particle simulation`](https://sanand0.github.io/autoimprove/#apps/particles.json) went from plain white dots on black to hundreds of bright, color‑shifting balls that bounce, die, and come back to life.
- [`Generate a fractal`](https://sanand0.github.io/autoimprove/#apps/fractal.json) changed from a single Mandelbrot image to an explorer you can zoom, drag, and reset with sliders and the mouse wheel.
- [`Generate a dashboard`](https://sanand0.github.io/autoimprove/#apps/dashboard.json) jumped from static charts to a live page with smooth card animations, modern fonts, and a real‑time stats box.

A few observations.

**Models are getting _much_ more reliable**. Even a low cost model like [GPT 4.1 Nano](https://platform.openai.com/docs/models/gpt-4.1-nano) wrote error-free code in ~100 retries.

**When pushed, they tend to brag**. They attach grand titles like <q>Ultimate Interactive Circle</q> or <q>Galactic Data Universe</q>. They sin out flash descriptions like <q>This dramatically upgraded clock features a pulsating neon glow, animated pulsing background glow, highly stylized tick marks, ...</q>

**A simple prompt like `Improve it` can spark new ideas**, revealing features such as:

- [Fading particle trails](https://sanand0.github.io/autoimprove/#apps/particles.json)
- [Smooth fractal color maps](https://sanand0.github.io/autoimprove/#apps/fractal.json)
- [Chart.js for dashboards](https://sanand0.github.io/autoimprove/#apps/dashboard.json)
- [Cyberpunk-style clocks](https://sanand0.github.io/autoimprove/#apps/clock.json)
- ... and a ["smorgasbord of intricate animated patterns"](https://sanand0.github.io/autoimprove/#apps/shapes.json)

But it's not just ideas. The implementations are pretty good, too. For example:

- **Circle drawer evolves into a full UX toolkit**
The trivial “draw circle” script morphed—step by step—into a drag‑and‑drop, boundary‑constrained, stylable circle with radius and color sliders, reset functionality, on‑canvas instructions, and polished styling transitions ​

- [The particle system morphed into a self‑healing, color‑shifting ecosystem](https://sanand0.github.io/autoimprove/#apps/particles.json).
It started with 200 white dots. After a few “Improve!” prompts, I got 300 dots that fade out, come back to life, and even change color on their own.

</section>
