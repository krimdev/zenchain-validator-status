const BATCH_ABI = [
    "function batchAll(address[] memory to, uint256[] memory value, bytes[] memory callData, uint64[] memory gasLimit) external payable returns (bool[] memory success, bytes[] memory result)"
];

const BATCH_ADDRESS = "0x0000000000000000000000000000000000000808";

// Global state
let updateInterval;
let isManuallyDisconnected = false;

// DOM Elements
const connectButton = document.getElementById('connectWallet');
const walletInfo = document.getElementById('walletInfo');
const batchResult = document.getElementById('batchResult');
const batchLoader = document.getElementById('batchLoader');

// Connect wallet function
async function connectWallet() {
    // Reset manually disconnected flag when user explicitly connects
    isManuallyDisconnected = false;
    localStorage.removeItem('walletManuallyDisconnected');

    try {
        if (typeof window.ethereum === 'undefined') {
            throw new Error('MetaMask is not installed');
        }

        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
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
        
        connectButton.textContent = 'Connected';
        connectButton.disabled = true;
        connectButton.classList.add('bg-gray-500');
        connectButton.classList.remove('bg-blue-500', 'hover:bg-blue-600');

        // Add disconnect event listener
        document.getElementById('disconnectWallet').addEventListener('click', disconnectWallet);

        // Enable staking buttons if available
        if (window.enableStakingButtons) {
            await window.enableStakingButtons();
        }

        // Set auto-update interval
        updateInterval = setInterval(() => {
            if (window.updateAllInfo) {
                window.updateAllInfo();
            }
        }, 30000);

    } catch (error) {
        walletInfo.innerHTML = `
            <div class="p-4 bg-red-100 text-red-700 rounded-md">
                Error: ${error.message}
            </div>
        `;
    }
}

// Disconnect wallet function
async function disconnectWallet() {
    // Clear auto-update interval
    if (updateInterval) clearInterval(updateInterval);
    
    // Set manually disconnected flag
    isManuallyDisconnected = true;
    localStorage.setItem('walletManuallyDisconnected', 'true');
    
    // Reset UI elements
    walletInfo.innerHTML = '';
    connectButton.textContent = 'Connect Wallet';
    connectButton.disabled = false;
    connectButton.classList.remove('bg-gray-500');
    connectButton.classList.add('bg-blue-500', 'hover:bg-blue-600');

}

// Check connection on page load
window.addEventListener('load', async () => {
    try {
        // Check if wallet was manually disconnected
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

// Event listeners
connectButton.addEventListener('click', connectWallet);
