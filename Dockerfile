FROM oven/bun:1.0.35

# Install system dependencies for Playwright
RUN apt-get update && apt-get install -y \
    fonts-roboto \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install

# Install Playwright browsers
# RUN bunx playwright install chromium
RUN bunx playwright install
RUN bunx playwright@1.48.2 install chromium
# RUN npm install -g playwright@1.48.2

# Copy the rest of the application
COPY . .

# Create public directory
RUN mkdir -p public

# Make the script executable
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

# Run the entrypoint script
CMD ["./entrypoint.sh"] 