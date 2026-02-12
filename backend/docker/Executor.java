import java.io.*;
import java.nio.file.*;
import org.json.JSONArray;
import org.json.JSONObject;

public class Executor {
    public static void main(String[] args) {
        JSONObject testResults = new JSONObject();
        testResults.put("passed", 0);
        testResults.put("failed", 0);
        testResults.put("totalTests", 0);
        testResults.put("testResults", new JSONArray());
        testResults.put("compilationError", JSONObject.NULL);

        try {
            // Load test cases
            String testCasesContent = new String(Files.readAllBytes(Paths.get("/app/testCases.json")));
            JSONArray testCases = new JSONArray(testCasesContent);
            testResults.put("totalTests", testCases.length());

            // Create instance of user's Solution class
            Solution solution = new Solution();

            // Run each test case
            for (int i = 0; i < testCases.length(); i++) {
                try {
                    JSONObject testCase = testCases.getJSONObject(i);
                    String input = testCase.getString("input");
                    String expectedOutput = testCase.getString("expectedOutput");
                    String explanation = testCase.getString("explanation");

                    // Parse input and execute test
                    int[] inputArray = parseInput(input);
                    int[] actualResult = solution.twoSum(inputArray, Integer.parseInt(expectedOutput));
                    String actualOutputStr = java.util.Arrays.toString(actualResult);

                    boolean passed = actualOutputStr.equals(expectedOutput);

                    JSONObject result = new JSONObject();
                    result.put("input", input);
                    result.put("expectedOutput", expectedOutput);
                    result.put("actualOutput", actualOutputStr);
                    result.put("passed", passed);
                    result.put("explanation", explanation);

                    testResults.getJSONArray("testResults").put(result);

                    if (passed) {
                        testResults.put("passed", testResults.getInt("passed") + 1);
                    } else {
                        testResults.put("failed", testResults.getInt("failed") + 1);
                    }
                } catch (Exception e) {
                    testResults.put("failed", testResults.getInt("failed") + 1);
                    JSONObject result = new JSONObject();
                    result.put("input", testCases.getJSONObject(i).getString("input"));
                    result.put("expectedOutput", testCases.getJSONObject(i).getString("expectedOutput"));
                    result.put("actualOutput", JSONObject.NULL);
                    result.put("passed", false);
                    result.put("explanation", testCases.getJSONObject(i).getString("explanation"));
                    result.put("error", e.getMessage());
                    testResults.getJSONArray("testResults").put(result);
                }
            }
        } catch (Exception e) {
            testResults.put("compilationError", e.getMessage());
        }

        System.out.println(testResults.toString(2));
    }

    private static int[] parseInput(String input) {
        String[] parts = input.replaceAll("[\\[\\] ]", "").split(",");
        int[] result = new int[parts.length];
        for (int i = 0; i < parts.length; i++) {
            result[i] = Integer.parseInt(parts[i]);
        }
        return result;
    }
}
