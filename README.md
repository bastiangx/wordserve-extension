<h1 align="center">
  <a href="https://github.com/bastiangx/wordserve-extension/">
 <picture>
      <source media="(prefers-color-scheme: light)" srcset="https://files.catbox.moe/su0r1m.png">
      <source media="(prefers-color-scheme: dark)" srcset="https://files.catbox.moe/syqbr0.png">
      <img src="https://files.catbox.moe/syqbr0.png"/>
    </picture>
  </a>
</h1>

<div align="center">
<h4>
Lightweight Autosuggestions and abbrevations in your browser!
</h4>

<br />

<div align="center">
    <picture>
      <source srcset="https://github.com/user-attachments/assets/0da6f300-0711-4f85-85c4-6a19c22a7f75" />
      <img src="https://github.com/user-attachments/assets/0da6f300-0711-4f85-85c4-6a19c22a7f75" alt="Example usage of wordserve suggestions engine in a client app" />
    </picture>
</div>

<br />
<a href="https://pkg.go.dev/github.com/bastiangx/wordserve"><img src="https://img.shields.io/badge/reference-black?style=for-the-badge&logo=go&logoSize=auto&labelColor=%23363A4F&color=%237dc4e4" alt="Go Reference"></a> <a href="https://goreportcard.com/report/github.com/bastiangx/wordserve"><img src="https://img.shields.io/badge/A%2B-black?style=for-the-badge&logoSize=auto&label=go%20report&labelColor=%23363A4F&color=%23a6da95" alt="Go Report Card"></a>
<br />
<!-- <a href="https://github.com/bastiangx/wordserve-extension/releases/latest"><img src="https://img.shields.io/github/v/release/bastiangx/wordserve-extension?sort=semver&display_name=tag&style=for-the-badge&labelColor=%23363A4F&color=%23f5a97f" alt="Latest Release"> -->
<!-- </a> -->
  <a href="https://github.com/bastiangx/wordserve-extension/blob/main/LICENSE"><img src="https://img.shields.io/badge/MIT-black?style=for-the-badge&label=license&labelColor=%23363A4F&color=%23b7bdf8" alt="MIT License"></a>
<br />

<a href="https://github.com/bastiangx/wordserve-extension/issues/new?assignees=&labels=bug&template=BUG-REPORT.yml&title=%5BBug%5D%3A+">Report a Bug</a>
·
<a href="https://github.com/bastiangx/wordserve-extension/issues/new?assignees=&labels=enhancement&template=FEATURE-REQUEST.yml&title=%5BFeature%5D%3A+">Request a Feature</a>

</div>

#### What's it about?

<table>
<tr>
<td>

WordServe is a minimalistic and high performance **Autocompletion plugin**.
It suggests top ranking words when typing and exapnsions on abbreviations! simple.
You can insert them by pressing `Tab` or `Enter` (or pressing the digit keys ;) )

#### Why?

So many desktop tools and apps I use on daily basis do not offer any form of word completion, AI/NLP driven or otherwise, there are times when I need to quickly find a word or phrase that I know exists in my vocabulary, but I don't feel like typing for _that_ long.

#### Similar to?

Think of this as a basic nvim-cmp or vscode Intellisense daemon.
Suggestions menu appear when typing any words + Expansions on text via abbreviations, defined and customisable by you.

> I quite frankly made this for myself so I can have a USABLE completion plugin for [Obsidian](https://obsidian.md) but hey, you might find it handy too!
> its still missing some big features like having auto correction and spelling, might add them if people find this actually useful.

</td>
</tr>
</table>

---

## Features

#### Batched Word Suggestions

Easily find the relevant words and phrases as you type,
suggestions are shown in a simple menu

 <picture>
      <source media="(prefers-color-scheme: light)" srcset="https://files.catbox.moe/zrosek.gif">
      <source media="(prefers-color-scheme: dark)" srcset="https://files.catbox.moe/ekrdxx.gif">
      <img src="https://files.catbox.moe/ekrdxx.gif"/>
    </picture>

<br />
<br />

Super fast and efficient, even with large dictionaries (65,000+ words)

 <picture>
      <source media="(prefers-color-scheme: light)" srcset="https://files.catbox.moe/sd3ikj.png">
      <source media="(prefers-color-scheme: dark)" srcset="https://files.catbox.moe/h26n6q.png">
      <img src="https://files.catbox.moe/h26n6q.png"/>
    </picture>
<br />

#### Abbrevation expansions

Automatically expands abbreviations as you type,
for example typing `btw` will expand to `by the way`

 <picture>
      <source media="(prefers-color-scheme: light)" srcset="https://files.catbox.moe/mlhfbn.gif">
      <source media="(prefers-color-scheme: dark)" srcset="https://files.catbox.moe/5inerx.gif">
      <img src="https://files.catbox.moe/5inerx.gif"/>
    </picture>
<br />

Easily add and manage your own abbreviations in the settings tab

 <picture>
      <source media="(prefers-color-scheme: light)" srcset="https://files.catbox.moe/d8t3d2.png">
      <source media="(prefers-color-scheme: dark)" srcset="https://files.catbox.moe/6gvijw.png">
      <img src="https://files.catbox.moe/6gvijw.png"/>
    </picture>
<br />

#### Digit selection

Use digits on the keyboard to quickly insert a suggestion from the list!

 <picture>
      <source media="(prefers-color-scheme: light)" srcset="https://files.catbox.moe/5inerx.gif">
      <source media="(prefers-color-scheme: dark)" srcset="https://files.catbox.moe/ex2oww.gif">
      <img src="https://files.catbox.moe/ex2oww.gif"/>
    </picture>
<br />

#### Responsive

Cross-platform and quick to use, built on top of a Radix trie binary dictionary.
Read more about how all this works in our [Go library's docs](https://github.com/bastiangx/wordserve/tree/main/docs)

 <picture>
      <source media="(prefers-color-scheme: light)" srcset="https://files.catbox.moe/ca82mt.png">
      <source media="(prefers-color-scheme: dark)" srcset="https://files.catbox.moe/8emcdr.png">
      <img src="https://files.catbox.moe/8emcdr.png"/>
    </picture>
<br />
<br />

#### Colorschemes

Many beautiful colorschemes to choose from, including dark and light modes out of the box

 <picture>
      <source media="(prefers-color-scheme: light)" srcset="https://files.catbox.moe/ip7m7h.png">
      <source media="(prefers-color-scheme: dark)" srcset="https://files.catbox.moe/jr5cl6.png">
      <img src="https://files.catbox.moe/jr5cl6.png"/>
    </picture>
<br />

#### Many many words

Start with a simple `words.txt` file containing 65,000+ entries.

 <picture>
      <source media="(prefers-color-scheme: light)" srcset="https://files.catbox.moe/z463kh.png">
      <source media="(prefers-color-scheme: dark)" srcset="https://files.catbox.moe/w4cn0v.png">
      <img src="https://files.catbox.moe/w4cn0v.png"/>
    </picture>

## Installation

todo: chrome,firefox,edge,opera,vivaldi,zen

#### Building and development

```sh
git clone https://github.com/bastiangx/wordserve-extension.git
cd wordserve-extension
```

1. install dependencies

```sh
bun install
```

> This extension is built on top of [WXT](https://wxt.dev/guide/introduction.html)

2. Run the prep script to fetch the latest dictionary `.bin` data files

```sh
bun run prep
```

3. Make your changes

4. run the development watch

```sh
bun run dev
# or simply
bun dev
# for Firefox
bun run dev:firefox
```

5. build for chromium based browsers

```sh
bun run build
# for Firefox
bun run build:firefox
```

WXT will output the build files to `.output/` folder.

```txt
.output
├── chrome-mv3         // Manifest V3 for Chromium
├── chrome-mv3-dev    // with devtools enabled
└── firefox-mv2      // Manifest V2 for Firefox
```

## Contributing

See the [open issues](https://github.com/bastiangx/wordserve-extension/issues) for a list of proposed features (and known issues).

Any PRs are welcome! Refer to the [guidelines](.github/CONTRIBUTING.md)

## License

WordServe is licensed under the **MIT license**.
Feel free to edit and distribute as you like.

See [LICENSE](LICENSE)

## Acknowledgements

- Inspired _heavily_ by [fluent-typer extension](https://github.com/bartekplus/FluentTyper) made by Bartosz Tomczyk.
  - <span style="color: #908caa;"> Its a great extension to use on browsers, but I wanted something that can be used basically in any electron/local webapps with plugin clients, but also make it wayyy faster and more efficient since the depeendencies used there are way too bloated (C++ ...) and had too many bindings for my liking, and also more imporatantly, make this a good practice for me to learn how radix tries work for prefixes.</span>

- The _Beautiful_ [Rosepine theme](https://rosepinetheme.com/) used for graphics and screenshots throughout the readme.
- The Incredible mono font, Berkeley Mono by [U.S. Graphics](https://usgraphics.com/products/berkeley-mono) used in screenshots, graphics, gifs and more.
