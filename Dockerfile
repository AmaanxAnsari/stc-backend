# Step 1: Chromium support ke liye node slim base image uthao
FROM node:20-slim

# Step 2: Puppeteer ke liye Debian packages aur dependencies install karo
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Step 3: Global Variables batayenge ki local Chrome download nahi karna hai
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Step 4: Working directory setup karo
WORKDIR /usr/src/app

# Step 5: package.json copy karke production dependencies install karo
COPY package*.json ./
RUN npm ci --only=production

# Step 6: Tumhara baaki ka saara code copy karo (src, templates, etc.)
COPY . .

# Step 7: Tumhara app portal (jaise logs me port 5000 dikha raha tha)
EXPOSE 5000

# Step 8: Start command tumhare app ke liye
CMD [ "node", "src/app.js" ]