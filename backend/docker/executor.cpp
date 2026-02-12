#include <iostream>
#include <fstream>
#include <sstream>
#include <vector>
#include <string>
#include <json/json.h>

using namespace std;

int main() {
    Json::Value testResults;
    testResults["passed"] = 0;
    testResults["failed"] = 0;
    testResults["totalTests"] = 0;
    testResults["testResults"] = Json::arrayValue;
    testResults["compilationError"] = Json::nullValue;

    try {
        // Load test cases
        ifstream testFile("/app/testCases.json");
        Json::Value testCases;
        testFile >> testCases;
        testFile.close();

        testResults["totalTests"] = (int)testCases.size();

        // Include the user code
        #include "/app/code.cpp"

        // Run each test case
        for (const auto& testCase : testCases) {
            try {
                string input = testCase["input"].asString();
                string expectedOutput = testCase["expectedOutput"].asString();
                string explanation = testCase["explanation"].asString();

                // Parse input and execute
                // Note: This is a template - specific implementation depends on problem signature
                vector<int> inputParams = parseInput(input);
                int actualResult = solution(inputParams);
                string actualOutputStr = to_string(actualResult);
                
                bool passed = actualOutputStr == expectedOutput;

                Json::Value result;
                result["input"] = input;
                result["expectedOutput"] = expectedOutput;
                result["actualOutput"] = actualOutputStr;
                result["passed"] = passed;
                result["explanation"] = explanation;

                testResults["testResults"].append(result);

                if (passed) {
                    testResults["passed"] = testResults["passed"].asInt() + 1;
                } else {
                    testResults["failed"] = testResults["failed"].asInt() + 1;
                }
            } catch (exception& e) {
                testResults["failed"] = testResults["failed"].asInt() + 1;
                Json::Value result;
                result["input"] = testCase["input"].asString();
                result["expectedOutput"] = testCase["expectedOutput"].asString();
                result["actualOutput"] = Json::nullValue;
                result["passed"] = false;
                result["explanation"] = testCase["explanation"].asString();
                result["error"] = e.what();
                testResults["testResults"].append(result);
            }
        }
    } catch (exception& e) {
        testResults["compilationError"] = e.what();
    }

    // Output results as JSON
    Json::StreamWriterBuilder writer;
    cout << Json::writeString(writer, testResults) << endl;

    return 0;
}

// Helper function to parse input
vector<int> parseInput(const string& input) {
    vector<int> result;
    stringstream ss(input);
    string item;
    while (getline(ss, item, ',')) {
        result.push_back(stoi(item));
    }
    return result;
}
