import Docker from 'dockerode';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const docker = new Docker({
  socketPath: process.platform === 'win32' ? '//./pipe/docker_engine' : '/var/run/docker.sock'
});

/**
 * Execute user code in an isolated Docker container
 * @param {string} language - Programming language (javascript, python, cpp, java)
 * @param {string} code - User code to execute
 * @param {array} testCases - Test cases array with input, expectedOutput, explanation
 * @returns {Promise<object>} - Test results object
 */
export async function executeInDocker(language, code, testCases) {
  const tempDir = path.join(os.tmpdir(), `judge-${Date.now()}`);
  
  try {
    // Create temporary directory
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Prepare files based on language
    const files = prepareFiles(language, code, testCases, tempDir);
    
    // Get or build Docker image
    const imageName = `judge-${language}:latest`;
    await ensureDockerImage(imageName, language);

    // Create and run container
    const container = await docker.createContainer({
      Image: imageName,
      HostConfig: {
        Binds: [`${tempDir}:/app`],
        Memory: 512 * 1024 * 1024, // 512 MB limit
        MemorySwap: 512 * 1024 * 1024,
        CPUQuota: 50000,
        CPUPeriod: 100000,
        PidsLimit: 100
      },
      Cmd: getContainerCommand(language),
      Timeout: 10000 // 10 second timeout
    });

    // Start container
    await container.start();

    // Wait for container to finish with timeout
    const result = await Promise.race([
      container.wait(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Code execution timeout')), 30000)
      )
    ]);

    // Get container logs
    const logs = await container.logs({
      stdout: true,
      stderr: true
    });

    const output = logs.toString('utf8');

    // Parse results
    const testResults = JSON.parse(output);

    // Clean up container
    await container.remove();

    return testResults;
  } catch (error) {
    return {
      passed: 0,
      failed: 1,
      totalTests: testCases.length,
      compilationError: error.message,
      testResults: []
    };
  } finally {
    // Cleanup temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

/**
 * Prepare files for Docker execution
 */
function prepareFiles(language, code, testCases, tempDir) {
  const files = {};

  // Write test cases
  const testCasesFile = path.join(tempDir, 'testCases.json');
  fs.writeFileSync(testCasesFile, JSON.stringify(testCases, null, 2));

  // Write code file based on language
  if (language === 'javascript') {
    const codeFile = path.join(tempDir, 'code.js');
    fs.writeFileSync(codeFile, code);
  } else if (language === 'python') {
    const codeFile = path.join(tempDir, 'code.py');
    fs.writeFileSync(codeFile, code);
  } else if (language === 'cpp') {
    const codeFile = path.join(tempDir, 'code.cpp');
    fs.writeFileSync(codeFile, code);
  } else if (language === 'java') {
    const codeFile = path.join(tempDir, 'Solution.java');
    fs.writeFileSync(codeFile, code);
  }

  return files;
}

/**
 * Get container start command based on language
 */
function getContainerCommand(language) {
  switch (language) {
    case 'javascript':
      return ['node', 'executor.js'];
    case 'python':
      return ['python', 'executor.py'];
    case 'cpp':
      return ['/app/executor'];
    case 'java':
      return ['java', '-cp', '/app', 'Executor'];
    default:
      return ['node', 'executor.js'];
  }
}

/**
 * Ensure Docker image exists, build if necessary
 */
async function ensureDockerImage(imageName, language) {
  try {
    // Try to get existing image
    const image = docker.getImage(imageName);
    await image.inspect();
    console.log(`✅ Docker image ${imageName} already exists`);
  } catch (error) {
    // Image doesn't exist, build it
    console.log(`🔨 Building Docker image ${imageName}...`);
    await buildDockerImage(imageName, language);
  }
}

/**
 * Build Docker image for a specific language
 */
async function buildDockerImage(imageName, language) {
  const dockerfilePath = path.join(process.cwd(), 'docker', `Dockerfile.${language}`);
  
  if (!fs.existsSync(dockerfilePath)) {
    throw new Error(`Dockerfile not found: ${dockerfilePath}`);
  }

  const dockerfileContent = fs.readFileSync(dockerfilePath, 'utf8');
  const contextPath = path.join(process.cwd(), 'docker');

  return new Promise((resolve, reject) => {
    docker.buildImage({
      dockerfile: `Dockerfile.${language}`,
      t: imageName
    }, { context: contextPath }, (err, stream) => {
      if (err) reject(err);

      stream.on('data', (chunk) => {
        const line = chunk.toString('utf8');
        if (line.includes('Successfully built') || line.includes('error')) {
          console.log(line);
        }
      });

      stream.on('end', resolve);
      stream.on('error', reject);
    });
  });
}

/**
 * Compare test results and generate summary
 */
export function generateResultsSummary(testResults) {
  const { passed, failed, totalTests, testResults: results } = testResults;

  const summary = {
    status: failed === 0 ? 'accepted' : 'rejected',
    passed,
    failed,
    totalTests,
    percentage: ((passed / totalTests) * 100).toFixed(2),
    details: results.map(r => ({
      status: r.passed ? 'PASS' : 'FAIL',
      input: r.input,
      expected: r.expectedOutput,
      actual: r.actualOutput,
      error: r.error || null
    }))
  };

  return summary;
}

/**
 * Cleanup all judge-* Docker images (optional)
 */
export async function cleanupDockerImages() {
  const images = await docker.listImages();
  const judgeImages = images.filter(img => 
    img.RepoTags && img.RepoTags.some(tag => tag.startsWith('judge-'))
  );

  for (const img of judgeImages) {
    const image = docker.getImage(img.Id);
    console.log(`🗑️ Removing image: ${img.RepoTags[0]}`);
    await image.remove();
  }
}

export { docker };
