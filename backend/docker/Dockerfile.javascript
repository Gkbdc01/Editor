# JavaScript Executor
FROM node:18-alpine

WORKDIR /app

# Install dependencies for running code
RUN npm install -g --silent

# Copy code and test cases
COPY code.js /app/code.js
COPY testCases.json /app/testCases.json

# Run the code with test cases
CMD ["node", "executor.js"]
