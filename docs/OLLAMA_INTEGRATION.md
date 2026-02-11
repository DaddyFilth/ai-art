# Ollama Integration Guide

## Overview

The AI Art Exchange platform uses a hybrid approach for AI image generation:
1. **Ollama** - For intelligent prompt enhancement and refinement
2. **Stable Diffusion WebUI** - For actual image generation

This local setup provides:
- Complete data privacy
- No API costs
- Full control over models
- Customizable generation parameters

---

## Architecture

```
User Request → Backend API → Ollama (Prompt Enhancement) → Stable Diffusion → Image Storage → User
```

### Flow:
1. User submits a prompt via the frontend
2. Backend validates the prompt and checks token balance
3. **Ollama enhances the prompt** using LLaVA or similar vision model
4. Enhanced prompt is sent to **Stable Diffusion WebUI**
5. SD generates the image and returns base64 data
6. Backend saves images to storage (S3 or local)
7. Asset record created in database with ownership logic
8. User receives the generated artwork

---

## Installation

### 1. Install Ollama

#### macOS
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

#### Linux
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

#### Windows
Download from: https://ollama.com/download/windows

### 2. Start Ollama Service

```bash
# Start Ollama server
ollama serve
```

The service will run on `http://localhost:11434` by default.

### 3. Pull Required Models

```bash
# Pull LLaVA for vision and prompt enhancement
ollama pull llava

# Alternative models you can try:
ollama pull llama2        # For text-based prompt refinement
ollama pull bakllava      # Alternative vision model
ollama pull mistral       # Fast, efficient model
```

### 4. Test Ollama

```bash
curl http://localhost:11434/api/generate -d '{
  "model": "llava",
  "prompt": "Enhance this image prompt: a cat in space",
  "stream": false
}'
```

---

## Stable Diffusion WebUI Setup

### 1. Clone Repository

```bash
git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui.git
cd stable-diffusion-webui
```

### 2. Install Dependencies

The WebUI will automatically install dependencies on first run.

### 3. Download Models

Place Stable Diffusion models in `models/Stable-diffusion/`:

**Recommended Models:**
- **Realistic Vision**: https://civitai.com/models/4201/realistic-vision-v60-b1
- **DreamShaper**: https://civitai.com/models/4384/dreamshaper
- **Anything V5**: https://civitai.com/models/9409/anything-v5

Download `.safetensors` or `.ckpt` files and place them in the models folder.

### 4. Start with API Enabled

```bash
# Start SD WebUI with API access
./webui.sh --api --listen

# For Windows:
webui-user.bat --api --listen

# Advanced options:
./webui.sh --api --listen --port 7860 --xformers
```

The WebUI will be available at:
- UI: http://localhost:7860
- API: http://localhost:7860/docs

---

## Configuration

### Environment Variables

Update your `.env` file:

```env
# Ollama Configuration
AI_API_URL=http://localhost:11434
OLLAMA_MODEL=llava
AI_API_KEY=not-required-for-ollama

# Stable Diffusion Configuration
SD_API_URL=http://localhost:7860
SD_DEFAULT_STEPS=30
SD_DEFAULT_CFG_SCALE=7
SD_DEFAULT_SAMPLER=DPM++ 2M Karras

# Development mode (uses mock data if services unavailable)
NODE_ENV=development
```

### Docker Configuration

If running in Docker, update `docker-compose.yml` to connect to host services:

```yaml
services:
  backend:
    environment:
      - AI_API_URL=http://host.docker.internal:11434
      - SD_API_URL=http://host.docker.internal:7860
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

---

## Usage

### API Request Example

```bash
curl -X POST http://localhost:3000/api/v1/ai/generate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A majestic dragon flying over mountains at sunset",
    "negativePrompt": "blurry, low quality, distorted",
    "width": 1024,
    "height": 1024,
    "style": "fantasy",
    "model": "llava"
  }'
```

### Process Flow

1. **Prompt Enhancement** (via Ollama):
   ```
   Input: "dragon in sky"
   Output: "A majestic dragon with shimmering scales, soaring through a vibrant sunset sky above snow-capped mountains, detailed fantasy art, cinematic lighting, 8k quality"
   ```

2. **Image Generation** (via Stable Diffusion):
   - Uses enhanced prompt
   - Applies generation parameters
   - Returns base64 image data

3. **Storage**:
   - Saves full resolution image
   - Creates thumbnail
   - Adds watermark
   - Stores in S3 or local filesystem

---

## Advanced Configuration

### Custom Ollama Models

Create custom models for your use case:

```bash
# Create a Modelfile
cat > Modelfile << EOF
FROM llava
SYSTEM You are an expert AI art prompt engineer specializing in creating detailed, high-quality prompts for Stable Diffusion.
PARAMETER temperature 0.8
PARAMETER num_predict 512
EOF

# Create custom model
ollama create art-prompter -f Modelfile
```

Update `.env`:
```env
OLLAMA_MODEL=art-prompter
```

### Stable Diffusion Parameters

Customize generation in `ai.service.ts`:

```typescript
const sdResponse = await this.callStableDiffusionApi(sdUrl, {
  prompt: enhancedPrompt,
  negative_prompt: request.negativePrompt || 'blurry, low quality',
  width: request.width || 1024,
  height: request.height || 1024,
  seed: parseInt(seed),
  steps: 30,              // More steps = better quality (slower)
  cfg_scale: 7,           // How closely to follow prompt (1-30)
  sampler_name: 'DPM++ 2M Karras',  // Sampling method
  restore_faces: true,    // Fix faces
  tiling: false,          // Tileable image
  enable_hr: false,       // High-res fix
});
```

---

## Performance Optimization

### Ollama

1. **Use GPU acceleration**:
   ```bash
   # NVIDIA GPU
   ollama serve --gpu
   ```

2. **Adjust model quantization**:
   - Smaller models load faster
   - Trade-off between quality and speed

### Stable Diffusion

1. **Enable xformers** (faster, less VRAM):
   ```bash
   ./webui.sh --api --xformers
   ```

2. **Reduce steps for faster generation**:
   - 20-25 steps usually sufficient
   - 30-50 for high quality

3. **Use smaller resolutions initially**:
   - Generate at 512x512, upscale later
   - Faster iteration during testing

---

## Troubleshooting

### Ollama Issues

**Service not starting:**
```bash
# Check if port is already in use
lsof -i :11434

# Kill existing process
pkill ollama

# Restart
ollama serve
```

**Model not found:**
```bash
# List installed models
ollama list

# Pull missing model
ollama pull llava
```

### Stable Diffusion Issues

**API not accessible:**
- Ensure you started with `--api` flag
- Check firewall settings
- Verify port 7860 is not in use

**Out of memory:**
```bash
# Use low VRAM mode
./webui.sh --api --lowvram

# Or medium VRAM
./webui.sh --api --medvram
```

**Slow generation:**
- Use xformers: `--xformers`
- Reduce image size
- Decrease steps
- Use faster sampler (Euler a, DPM++ 2M)

---

## Production Deployment

### Using Separate Servers

In production, run Ollama and SD on dedicated GPU servers:

```env
# Production configuration
AI_API_URL=http://ollama-server:11434
SD_API_URL=http://sd-server:7860
```

### Load Balancing

For high traffic, use multiple SD instances:

```javascript
const sdServers = [
  'http://sd-1:7860',
  'http://sd-2:7860',
  'http://sd-3:7860',
];

// Round-robin or least-loaded selection
const sdUrl = selectServer(sdServers);
```

### Monitoring

Monitor service health:

```bash
# Check Ollama
curl http://localhost:11434/api/tags

# Check SD API
curl http://localhost:7860/sdapi/v1/sd-models
```

---

## Alternative: Cloud Ollama

If you prefer cloud deployment:

```env
# Use Ollama cloud service
AI_API_URL=https://api.ollama.ai
AI_API_KEY=your-cloud-api-key
```

---

## Resources

- **Ollama**: https://ollama.com
- **Stable Diffusion WebUI**: https://github.com/AUTOMATIC1111/stable-diffusion-webui
- **Models**: https://civitai.com
- **Ollama Models**: https://ollama.com/library

---

## Support

For issues with:
- **Ollama**: https://github.com/ollama/ollama/issues
- **SD WebUI**: https://github.com/AUTOMATIC1111/stable-diffusion-webui/issues
- **This Integration**: See main project README
