const express = require("express");
const fs = require("fs");
const cors = require("cors");
const sharp = require("sharp");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

let lastImage = "";
let lockState = "lock";

// RGB565 to RGBA8888 conversion helper
function rgb565ToRgbaBuffer(rgb565Buffer, width, height) {
  const rgbaBuffer = Buffer.alloc(width * height * 4);

  for (let i = 0; i < width * height; i++) {
    const byte1 = rgb565Buffer[i * 2];
    const byte2 = rgb565Buffer[i * 2 + 1];
    const value = (byte1 << 8) | byte2;

    const r = ((value >> 11) & 0x1f) << 3;
    const g = ((value >> 5) & 0x3f) << 2;
    const b = (value & 0x1f) << 3;

    rgbaBuffer[i * 4] = r;
    rgbaBuffer[i * 4 + 1] = g;
    rgbaBuffer[i * 4 + 2] = b;
    rgbaBuffer[i * 4 + 3] = 255; // opaque alpha
  }

  return rgbaBuffer;
}

app.post("/upload", async (req, res) => {
  const base64Data = req.body.image;
  const rawBuffer = Buffer.from(base64Data, "base64");

  const width = 320;
  const height = 240;

  const rgbaBuffer = rgb565ToRgbaBuffer(rawBuffer, width, height);

  try {
    const pngBuffer = await sharp(rgbaBuffer, {
      raw: {
        width,
        height,
        channels: 4,
      },
    })
      .png()
      .toBuffer();

    lastImage = pngBuffer.toString("base64");
    fs.writeFileSync("converted_image.png", pngBuffer); // optional: for debug
    res.send("Image converted and saved");
  } catch (err) {
    console.error("Image conversion failed:", err);
    res.status(500).send("Failed to convert image");
  }
});

app.get("/image", (req, res) => {
  res.send({ image: lastImage });
});

app.get("/lock-state", (req, res) => {
  res.send(lockState);
});

app.post("/toggle-lock", (req, res) => {
  lockState = req.body.state; // "lock" or "unlock"
  res.send("State updated");
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
