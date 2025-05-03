![Swiftgum n8n Node](https://user-images.githubusercontent.com/10284570/173569848-c624317f-42b1-45a6-ab09-f0ea3c247648.png)

# n8n-nodes-swiftgum-trigger

A custom [n8n](https://n8n.io) trigger node built by Swiftgum.

This node allows you to trigger workflows from Swiftgum-related events or integrations.

---

## 🚀 Features

- Custom trigger node for Swiftgum-specific events
- Built for compatibility with the latest n8n versions
- Ready to use in your local or cloud-hosted n8n instance

---

## 🧰 Installation

You can install this package directly via the n8n UI or CLI.

### Via n8n UI

Paste this URL into the **Install from npm** input:

```
https://www.npmjs.com/package/n8n-nodes-swiftgum-trigger
```

### Via CLI (inside your custom n8n setup)

```bash
pnpm add n8n-nodes-swiftgum-trigger
```

---

## 🧪 Local Development

To test this node locally:

```bash
pnpm install
pnpm build
```

You can also use our internal dev environment with Docker:

```bash
./fetch-node.sh
docker compose up --build
```

---

## 🗂 File Structure

```
n8n-nodes-swiftgum-trigger/
├── credentials/           # Custom credential classes
├── nodes/                 # Swiftgum Trigger node definition
├── dist/                  # Compiled output
├── gulpfile.js            # Icon handling
├── tsconfig.json
├── package.json
└── README.md
```

---

## 🧑‍💻 Contributing

Pull requests and contributions are welcome! Please:
- Follow the code structure in `nodes/` and `credentials/`
- Run `pnpm lint` before submitting
- Build locally and test in a running n8n instance

---

## 📄 License

[MIT](LICENSE.md)
