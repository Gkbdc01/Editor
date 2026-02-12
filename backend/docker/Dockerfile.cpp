# C++ Executor
FROM gcc:13-alpine

WORKDIR /app

# Install required tools
RUN apk add --no-cache g++ make

# Copy code and test cases
COPY code.cpp /app/code.cpp
COPY testCases.json /app/testCases.json
COPY executor.cpp /app/executor.cpp

# Compile the code
RUN g++ -o /app/executor /app/executor.cpp /app/code.cpp -std=c++17

# Run executor
CMD ["/app/executor"]
