import Docker from 'dockerode';
import { v4 as uuidv4 } from 'uuid';

const docker = new Docker();

// Added official C++ (GCC) and Java (Eclipse Temurin) images
const imageMap = {
    javascript: 'node:20-alpine',
    python: 'python:3.11-alpine',
    cpp: 'gcc:13', 
    java: 'eclipse-temurin:21-jdk'
};

class ContainerPoolManager {
    constructor() {
        this.pools = { javascript: [], python: [], cpp: [], java: [] };
        this.POOL_SIZE = 2; // Adjust based on your server size
    }

    async initialize() {
        console.log('🔥 Initializing Hardened Container Pools...');
        for (const lang of Object.keys(this.pools)) {
            console.log(`⬇️  Pulling image for ${lang}...`);
            await this.pullImage(imageMap[lang]);
            for (let i = 0; i < this.POOL_SIZE; i++) {
                await this.replenish(lang);
            }
        }
        console.log('✅ All pools are warm and highly secure!');
    }

    async pullImage(imageName) {
        return new Promise((resolve, reject) => {
            docker.pull(imageName, (err, stream) => {
                if (err) return reject(err);
                docker.modem.followProgress(stream, (err, output) => err ? reject(err) : resolve(output));
            });
        });
    }

    async replenish(language) {
        try {
            const containerName = `warm-${language}-${uuidv4()}`;
            const container = await docker.createContainer({
                Image: imageMap[language],
                name: containerName,
                HostConfig: {
                    // 🛡️ THE HARDENED SANDBOX CONFIGURATION 🛡️
                    Memory: 512 * 1024 * 1024,      // 512MB RAM Limit (Java needs a bit more to compile)
                    MemorySwap: 512 * 1024 * 1024,  // Disable Swap memory
                    PidsLimit: 50,                  // Prevent Fork Bombs
                    NetworkMode: 'none',            // No Internet Access
                    CapDrop: ['ALL'],               // Drop all Linux capabilities
                    SecurityOpt: ['no-new-privileges'], // Prevent privilege escalation
                    ReadonlyRootfs: true,           // Lock the entire filesystem
                    Tmpfs: { '/tmp': 'size=50m,exec' } // Only /tmp is writable, and allowed to execute binaries (for C++)
                },
                Cmd: ['tail', '-f', '/dev/null']
            });

            await container.start();
            this.pools[language].push({ name: containerName, instance: container });
            console.log(`[Pool] ➕ Replenished ${language}. (Ready: ${this.pools[language].length})`);
        } catch (error) {
            console.error(`[Pool] ❌ Failed to replenish ${language}:`, error.message);
        }
    }

    async acquireContainer(language) {
        if (this.pools[language].length > 0) {
            const containerData = this.pools[language].pop();
            this.replenish(language); 
            return containerData;
        }
        // Fallback for traffic spikes
        const containerName = `spike-${language}-${uuidv4()}`;
        const container = await docker.createContainer({
            Image: imageMap[language],
            name: containerName,
            HostConfig: { 
                Memory: 512 * 1024 * 1024, MemorySwap: 512 * 1024 * 1024, PidsLimit: 50, 
                NetworkMode: 'none', CapDrop: ['ALL'], SecurityOpt: ['no-new-privileges'], 
                ReadonlyRootfs: true, Tmpfs: { '/tmp': 'size=50m,exec' }
            },
            Cmd: ['tail', '-f', '/dev/null']
        });
        await container.start();
        return { name: containerName, instance: container };
    }

    async demolishContainer(containerInstance) {
        try { await containerInstance.remove({ force: true }); } 
        catch (error) { console.error(`[Pool] ❌ Demolish failed:`, error.message); }
    }
}

export const poolManager = new ContainerPoolManager();