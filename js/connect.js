const BATCH_ABI = [
    "function batchAll(address[] memory to, uint256[] memory value, bytes[] memory callData, uint64[] memory gasLimit) external payable returns (bool[] memory success, bytes[] memory result)"
];

const STATUS_ABI = [
    "function status(address who) external view returns (uint8)"
];

const BATCH_ADDRESS = "0x0000000000000000000000000000000000000808";
const STATUS_ADDRESS = "0x0000000000000000000000000000000000000800";

let updateInterval;
let isManuallyDisconnected = false;

const connectButton = document.getElementById('connectWallet');
const walletInfo = document.getElementById('walletInfo');
const batchResult = document.getElementById('batchResult');
const batchLoader = document.getElementById('batchLoader');

async function connectWallet() {
    isManuallyDisconnected = false;
    localStorage.removeItem('walletManuallyDisconnected');

    try {
        if (typeof window.ethereum === 'undefined') {
            throw new Error('MetaMask is not installed');
        }

        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        currentValidatorAddress = accounts[0];
        const provider = new ethers.BrowserProvider(window.ethereum);
        const staking = new ethers.Contract(STATUS_ADDRESS, STATUS_ABI, provider);
        
        const validatorStatus = await staking.status(accounts[0]);
        
        const statusNumber = Number(validatorStatus.toString()); 
        console.log(statusNumber)
        console.log("Validator status:", validatorStatus);
        console.log("Is validator?", validatorStatus === 2);

        if (statusNumber !== 2) {
            document.querySelector('.grid.grid-cols-1.md\\:grid-cols-2').style.display = 'none';
            document.querySelector('.bg-white.rounded-lg.shadow-md.p-6:last-child').style.display = 'none'; 
            document.getElementById('nativeStaking').style.display = 'none';
            walletInfo.innerHTML = `
                <div class="p-4 bg-yellow-100 text-yellow-700 rounded-md flex justify-between items-center">
                    <span>This wallet is not a validator. Only validators can access this dashboard.</span>
                    <button id="disconnectWallet" class="text-gray-600 hover:text-red-600">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </button>
                </div>
            `;
            connectButton.style.display = 'none';
        } else {
            walletInfo.innerHTML = `
                <div class="p-4 bg-green-100 text-green-700 rounded-md flex justify-between items-center">
                    <span>Connected: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}</span>
                    <button id="disconnectWallet" class="text-gray-600 hover:text-red-600">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </button>
                </div>
            `;
            connectButton.style.display = 'none';

            if (window.enableStakingButtons) {
                await window.enableStakingButtons();
            }

            updateInterval = setInterval(() => {
                if (window.updateAllInfo) {
                    window.updateAllInfo();
                }
            }, 3600000);
        }

        document.getElementById('disconnectWallet').addEventListener('click', disconnectWallet);

    } catch (error) {
        walletInfo.innerHTML = `
            <div class="p-4 bg-red-100 text-red-700 rounded-md">
                Error: ${error.message}
            </div>
        `;
    }
}

async function disconnectWallet() {
    if (updateInterval) clearInterval(updateInterval);
    
    isManuallyDisconnected = true;
    localStorage.setItem('walletManuallyDisconnected', 'true');
    
    walletInfo.innerHTML = '';
    connectButton.style.display = 'block';
    connectButton.textContent = 'Connect Wallet';
    connectButton.disabled = false;
    connectButton.classList.remove('bg-gray-500');
    connectButton.classList.add('bg-blue-500', 'hover:bg-blue-600');


    document.querySelector('.grid.grid-cols-1.md\\:grid-cols-2').style.display = 'grid';
    document.querySelector('.bg-white.rounded-lg.shadow-md.p-6:last-child').style.display = 'block';

    if (stakeButton && unstakeButton) {
        stakeButton.disabled = true;
        unstakeButton.disabled = true;
    }
}

window.addEventListener('load', async () => {
    try {

        if (localStorage.getItem('walletManuallyDisconnected') === 'true') {
            return;
        }

        if (typeof window.ethereum !== 'undefined') {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
                await connectWallet();
            }
        }
    } catch (error) {
        console.error("Error checking wallet connection:", error);
    }
});

connectButton.addEventListener('click', connectWallet);
