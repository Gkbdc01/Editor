# Java Executor
FROM openjdk:21-slim

WORKDIR /app

# Copy code and test cases
COPY Solution.java /app/Solution.java
COPY testCases.json /app/testCases.json
COPY Executor.java /app/Executor.java

# Compile Java code
RUN javac /app/Solution.java && javac /app/Executor.java

# Run executor
CMD ["java", "-cp", "/app", "Executor"]
