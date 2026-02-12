import json
import sys
import traceback

test_results = {
    'passed': 0,
    'failed': 0,
    'totalTests': 0,
    'testResults': [],
    'compilationError': None
}

try:
    # Load test cases
    with open('/app/testCases.json', 'r') as f:
        test_cases = json.load(f)
    
    test_results['totalTests'] = len(test_cases)

    # Load user code
    with open('/app/code.py', 'r') as f:
        user_code = f.read()
    
    # Execute code in isolated namespace
    namespace = {}
    exec(user_code, namespace)

    # Get the main function
    function_name = None
    for name, obj in namespace.items():
        if callable(obj) and not name.startswith('_'):
            function_name = name
            break
    
    if not function_name:
        raise Exception("No function found in submitted code")

    user_function = namespace[function_name]

    # Run each test case
    for test_case in test_cases:
        try:
            input_str = test_case['input']
            expected_output = test_case['expectedOutput']
            explanation = test_case['explanation']

            # Parse input
            input_params = parse_input(input_str)

            # Execute function
            actual_output = user_function(*input_params)
            actual_output_str = json.dumps(actual_output)
            expected_output_str = json.dumps(json.loads(expected_output))

            passed = actual_output_str == expected_output_str

            test_results['testResults'].append({
                'input': input_str,
                'expectedOutput': expected_output,
                'actualOutput': actual_output_str,
                'passed': passed,
                'explanation': explanation
            })

            if passed:
                test_results['passed'] += 1
            else:
                test_results['failed'] += 1

        except Exception as error:
            test_results['failed'] += 1
            test_results['testResults'].append({
                'input': test_case['input'],
                'expectedOutput': test_case['expectedOutput'],
                'actualOutput': None,
                'passed': False,
                'explanation': test_case['explanation'],
                'error': str(error)
            })

except Exception as error:
    test_results['compilationError'] = str(error)

def parse_input(input_str):
    try:
        if input_str.startswith('['):
            return json.loads(input_str)
        return [json.loads(x.strip()) if x.strip()[0] in '[{"-0123456789' else x.strip() for x in input_str.split(',')]
    except:
        return [input_str]

print(json.dumps(test_results))
