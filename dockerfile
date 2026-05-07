# Using Node LTS slim for a balance of stability and lightness
FROM node:20-slim
WORKDIR /usr/src/app

# Copy package files first to leverage Docker layer caching
COPY package*.json ./
RUN npm install --production

# Copy the rest of your source code (including the src folder)
COPY . .

# Set environment to production
ENV NODE_ENV=production

# Use npm start just like you do on your local machine!
CMD [ "npm", "start" ]