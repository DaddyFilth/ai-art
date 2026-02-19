# Ollama Integration Guide

## Overview

The AI Art Exchange platform uses AI for intelligent prompt enhancement and image generation:
1. **Ollama** - For intelligent prompt enhancement and refinement (Local OR Cloud)
2. **Stable Diffusion WebUI** - For actual image generation (Local setup)

## Deployment Options

### Option 1: Ollama Cloud (Recommended for Production)
- **No local setup required** - Ollama runs in the cloud
- **Hassle-free deployment** - No GPU server management
- **Scalable and reliable** - Enterprise-grade infrastructure
- **Cost-based** - Pay for usage (Free tier available)
- **Requires API key** - Get from https://ollama.com/pricing

### Option 2: Local Ollama (Development/Self-Hosted)
- **Complete data privacy** - Everything runs on your infrastructure
- **No API costs** - Free to use
- **Full control** - Customize models and parameters
- **Requires setup** - Install Ollama locally and manage updates

---

## Quick Start - Ollama Cloud (Recommended)

### 1. Get Ollama Cloud API Key

1. Visit https://ollama.com/pricing
2. Choose a plan:
   - **Free**: Light usage, experimentation
   - **Pro ($20/month)**: Regular RAG, document analysis, coding
   - **Max ($100/month)**: High-throughput, automation, enterprise workflows
3. Sign up and get your API key

### 2. Configure Environment

Update your `.env` file:

```env
# Ollama Cloud Configuration
AI_API_URL=https://api.ollama.com
OLLAMA_MODEL=llama3.2
OLLAMA_CLOUD_API_KEY=ollama_your_api_key_here

# Stable Diffusion (still requires local setup)
SD_API_URL=http://localhost:7860
```

### 3. That's it!

Your backend will now use Ollama Cloud for prompt enhancement. No local Ollama installation needed.

---

## Local Setup - Self-Hosted Ollama

This local setup provides:
- **No external API keys needed** - Everything runs locally
- Complete data privacy
- No API costs or usage limits
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
# Pull Llama 3.2 for prompt enhancement (recommended)
ollama pull llama3.2

# Alternative models you can try:
ollama pull llama3.1      # Larger, more capable
ollama pull mistral       # Fast, efficient model
ollama pull llama2        # For text-based prompt refinement
ollama pull llava         # Vision model (for image analysis)
```

### 4. Test Ollama

**For Cloud:**
```bash
curl https://api.ollama.com/api/generate \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.2",
    "prompt": "Enhance this image prompt: a cat in space",
    "stream": false
  }'
```

**For Local:**
```bash
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.2",
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

**For Ollama Cloud (Recommended for Production):**

```env
# Ollama Cloud Configuration
AI_API_URL=https://api.ollama.com
OLLAMA_MODEL=llama3.2
OLLAMA_CLOUD_API_KEY=<YOUR_OLLAMA_API_KEY>

# Stable Diffusion Configuration - No API key needed!
SD_API_URL=http://localhost:7860
SD_DEFAULT_STEPS=30
SD_DEFAULT_CFG_SCALE=7
SD_DEFAULT_SAMPLER=DPM++ 2M Karras

# Development mode (uses mock data if services unavailable)
NODE_ENV=development
```

**For Local Ollama (Development/Self-Hosted):**

```env
# Ollama Local Configuration - No API key needed!
AI_API_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
OLLAMA_CLOUD_API_KEY=

# Stable Diffusion Configuration - No API key needed!
SD_API_URL=http://localhost:7860
SD_DEFAULT_STEPS=30
SD_DEFAULT_CFG_SCALE=7
SD_DEFAULT_SAMPLER=DPM++ 2M Karras

# Development mode (uses mock data if services unavailable)
NODE_ENV=development
```

**Note:** The `AI_API_KEY` field exists for compatibility but is not used by Ollama. The service automatically detects whether to use cloud (with `OLLAMA_CLOUD_API_KEY`) or local mode based on the `AI_API_URL`.

### Docker Configuration

**For Ollama Cloud:**

Update `docker-compose.yml` backend environment:

```yaml
services:
  backend:
    environment:
      - AI_API_URL=https://api.ollama.com
      - OLLAMA_CLOUD_API_KEY=${OLLAMA_CLOUD_API_KEY}
      - SD_API_URL=http://host.docker.internal:7860
    extra_hosts:
      - "host.docker.internal:host-gateway"  # Only needed for SD
```

**For Local Ollama:**

If running in Docker, connect to host services:

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
    "model": "llama3.2"
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
FROM llama3.2
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

### Ollama Cloud (Recommended)

For production environments, using Ollama Cloud provides several benefits:

**Advantages:**
- **No Infrastructure Management**: No need to provision GPU servers or manage Ollama installations
- **Automatic Scaling**: Handles traffic spikes automatically
- **High Availability**: Enterprise-grade uptime and reliability
- **Latest Models**: Access to newest models without manual updates
- **Security**: Encrypted API calls, no data logging
- **Cost Predictable**: Pay-per-use with clear pricing tiers

**Setup:**
```env
# Production configuration with Ollama Cloud
AI_API_URL=https://api.ollama.com
OLLAMA_CLOUD_API_KEY=your_production_api_key
OLLAMA_MODEL=llama3.2
```

**Best Practices:**
1. Use environment variables for API key (never hardcode)
2. Monitor API usage through Ollama dashboard
3. Set up alerts for usage thresholds
4. Use Pro or Max tier for production workloads
5. Implement rate limiting on your backend
6. Cache frequent prompt enhancements

### Self-Hosted Ollama (Advanced)

For organizations requiring complete control:

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

## Pricing Comparison

### Ollama Cloud

| Plan | Price | Use Case |
|------|-------|----------|
| Free | $0/month | Experimentation, light usage |
| Pro | $20/month | Regular RAG, document analysis, coding |
| Max | $100/month | High-throughput, automation, enterprise |

**Features:**
- No data logging or training on your prompts
- Encrypted API calls
- Same API as local Ollama
- Access to all models
- No setup required

Get started: https://ollama.com/pricing

### Self-Hosted Ollama

| Component | Cost | Notes |
|-----------|------|-------|
| GPU Server | $500-2000/month | AWS p3.2xlarge, GCP with T4/V100 |
| Setup Time | 2-4 hours | Initial configuration |
| Maintenance | 4-8 hours/month | Updates, monitoring, scaling |
| Total Cost | $500-2000+/month | Plus DevOps time |

**Best For:**
- Organizations with existing GPU infrastructure
- Strict data residency requirements
- High-volume usage (>100k requests/month)
- Custom model fine-tuning needs

---

## Resources

- **Ollama Cloud**: https://ollama.com/pricing
- **Ollama Cloud Docs**: https://docs.ollama.com/cloud
- **Ollama GitHub**: https://github.com/ollama/ollama
- **Stable Diffusion WebUI**: https://github.com/AUTOMATIC1111/stable-diffusion-webui
- **Models**: https://civitai.com
- **Ollama Models**: https://ollama.com/library

---

## Support

For issues with:
- **Ollama**: https://github.com/ollama/ollama/issues
- **SD WebUI**: https://github.com/AUTOMATIC1111/stable-diffusion-webui/issues
- **This Integration**: See main project README
