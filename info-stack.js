const STAKING_ABI = [
    "function bondWithRewardDestination(uint256 value, uint8 dest) external returns (bool)",
    "function unbond(uint256 value) external returns (bool)",
    "function withdrawUnbonded(uint32 numSlashingSpans) external returns (bool)",
    "function bondExtra(uint256 value) external returns (bool)",
    "function isUnbonding(address who) external view returns (bool)",
    "function bondingDuration() external view returns (uint256)",
    "function stake(address who) external view returns (uint256 total, uint256 active)",
    "function status(address who) external view returns (uint8)",
    "function currentEra() external view returns (uint256)",
    "function activeEra() external view returns (uint256)",
    "function validatorPrefs(address who) external view returns (uint256, bool)",
    "function erasValidatorTotalStake(uint32 eraIndex, address validatorStash) external view returns (uint256 totalStake, uint256 ownStake)",
    "function erasValidatorNominatorsCount(uint32 eraIndex, address validatorStash) external view returns (uint32 numNominators, uint32 numPages)",
    "function erasValidatorNominationPageTotalExposure(uint32 eraIndex, address validatorStash, uint32 pageIndex) external view returns (uint256)",
    "function erasValidatorPrefs(uint32 eraIndex, address validatorStash) external view returns (uint256 commission, bool blocked)",
    "function erasValidatorRewardPoints(uint32 eraIndex, address validatorStash) external view returns (uint256)",
    "function erasValidatorNominationPageNominatorExposure(uint32 eraIndex, address validatorStash, uint32 pageIndex, uint32 nominationIndex) external view returns (address who, uint256 value)" ];
 
 const STAKING_ADDRESS = "0x0000000000000000000000000000000000000800";
 
 let currentValidatorAddress = "0xef459153B68648947B6D2863B902595e22040FfA";
 let currentUserAddress = null;
 
 // DOM Elements
 const stakeButton = document.getElementById('stakeButton');
 const unstakeButton = document.getElementById('unstakeButton');
 const stakeAmount = document.getElementById('stakeAmount');
 const unstakeAmount = document.getElementById('unstakeAmount');
 const stakingLoader = document.getElementById('stakingLoader');
 const validatorStats = document.getElementById('validatorStats');
 const stakeInfo = document.getElementById('stakeInfo');
 const stakeResult = document.getElementById('stakeResult');
 const unstakeResult = document.getElementById('unstakeResult');
 
 async function updateAllInfo() {
    try {
        console.log("UpdateAllInfo started");
        stakingLoader.style.display = 'block';
        const provider = new ethers.BrowserProvider(window.ethereum);
        const staking = new ethers.Contract(STAKING_ADDRESS, STAKING_ABI, provider);
        
        await updateDashboard(currentValidatorAddress, staking);
        
        if (currentUserAddress) {
            await updateUserInfo(currentUserAddress, staking);
        }
    } catch (error) {
        console.error("Error updating info:", error);
    } finally {
        stakingLoader.style.display = 'none';
    }
 }
 
 async function updateDashboard(validatorAddress, staking) {
    try {
        console.log("Starting dashboard update");
        
            const currentEra = await staking.currentEra();
            const activeEra = await staking.activeEra();
            console.log("Eras:", { currentEra: currentEra.toString(), activeEra: activeEra.toString() });

            const [eraPrefsCommission, eraPrefsBlocked] = await staking.erasValidatorPrefs(activeEra, validatorAddress);
            const rewardPoints = await staking.erasValidatorRewardPoints(activeEra, validatorAddress);
            console.log("Validator Era Info:", {
                commission: (Number(eraPrefsCommission) / 10000000).toFixed(2) + "%",
                blocked: eraPrefsBlocked,
                rewardPoints: rewardPoints.toString()
            });

        const validatorStatus = await staking.status(validatorAddress);
        const statusText = {
            0: "Inactive",
            1: "Nominator",
            2: "Validator",
            3: "Idle"
        }[validatorStatus];
        console.log("Validator status:", validatorStatus, "->", statusText);

        const [commission, blocked] = await staking.validatorPrefs(validatorAddress);
        const [totalStake, ownStake] = await staking.erasValidatorTotalStake(activeEra, validatorAddress);
        const [numNominators, numPages] = await staking.erasValidatorNominatorsCount(activeEra, validatorAddress);

        document.getElementById('validatorStatus').innerHTML = `
        <span class="${validatorStatus == 2 ? 'text-green-600 font-semibold' : 'text-yellow-600'}">
            Status: ${statusText}
            ${!eraPrefsBlocked 
                ? '<svg class="inline w-4 h-4 ml-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
                : '<svg class="inline w-4 h-4 ml-1 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
            }
        </span>
        `;
        document.getElementById('eraPointsDisplay').textContent = `${rewardPoints.toString()} points`;

        document.getElementById('currentEraDisplay').innerHTML = `
            <div>Current: ${currentEra}, Active: ${activeEra}</div>
        `;
        
        document.getElementById('commissionDisplay').textContent = 
            `${(Number(commission) / 10000000).toFixed(2)}%`;
        document.getElementById('nominatorsCountDisplay').textContent = 
            `${numNominators} nominators`;
        document.getElementById('totalStakeDisplay').textContent = 
            `${Number(ethers.formatEther(totalStake)).toFixed(2)} ZCX (Own: ${Number(ethers.formatEther(ownStake)).toFixed(2)} ZCX)`;

        const nominatorsList = document.getElementById('nominatorsList');
        nominatorsList.innerHTML = `
            <div class="space-y-2">
                <div class="p-3 bg-blue-50 rounded">
                    <span class="text-sm font-medium text-blue-600">Total Nominators: ${numNominators}</span>
                </div>
            </div>
        `;
        
        for (let page = 0; page < numPages; page++) {
            for (let i = 0; i < numNominators; i++) {
                try {
                    const [nominatorAddress, stake] = await staking.erasValidatorNominationPageNominatorExposure(
                        activeEra,
                        validatorAddress,
                        page,
                        i
                    );

                    if (nominatorAddress !== "0x0000000000000000000000000000000000000000") {
                        const stakeFormatted = Number(ethers.formatEther(stake)).toFixed(2);
                        nominatorsList.innerHTML += `
                            <div class="p-3 bg-gray-50 rounded flex justify-between items-center hover:bg-gray-100">
                                <a href="https://zentrace.io/address/${nominatorAddress}" 
                                   target="_blank" 
                                   class="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline">
                                    ${nominatorAddress.slice(0, 6)}...${nominatorAddress.slice(-4)}
                                </a>
                                <span class="text-sm text-gray-600 font-medium">${stakeFormatted} ZCX</span>
                            </div>
                        `;
                    }
                } catch (error) {
                    if (error.message.includes("No nomination found")) {
                        break;
                    } else {
                        console.error(`Error on page ${page}, index ${i}:`, error);
                        break;
                    }
                }
            }
        }

        console.log("Dashboard update completed");
    } catch (error) {
        console.error("Error updating dashboard:", error);
        document.getElementById('validatorStats').innerHTML = `
            <div class="p-4 bg-red-100 text-red-700 rounded-md">
                Error: ${error.message}
            </div>
        `;
    }
}
 async function updateUserInfo(userAddress, staking) {
    try {
        console.log("Starting user info update");
        const [total, active] = await staking.stake(userAddress);
        const isUnbonding = await staking.isUnbonding(userAddress);
        const bondingDuration = await staking.bondingDuration();
        const currentEra = await staking.currentEra();
 
        const totalStaked = Number(ethers.formatEther(total)).toFixed(2);
        const activeStake = Number(ethers.formatEther(active)).toFixed(2);
 
        stakeInfo.innerHTML = `
            <div class="p-4 bg-blue-100 text-blue-700 rounded-md">
                <div>Your Stake: ${totalStaked} ZCX (${activeStake} ZCX active)</div>
                <div class="mt-2">
                    ${isUnbonding ? 
                        `<span class="text-yellow-600">
                            Unstaking in progress: Available at era ${Number(currentEra) + Number(bondingDuration)}
                        </span>` : 
                        'No unstaking in progress'}
                </div>
            </div>
        `;
 
        if (total > 0) {
            stakeButton.textContent = "Bond Extra";
            stakeButton.removeEventListener('click', stake);
            stakeButton.addEventListener('click', bondExtra);
        }
        console.log("User info update completed");
    } catch (error) {
        console.error("Error updating user info:", error);
        stakeInfo.innerHTML = `
            <div class="p-4 bg-red-100 text-red-700 rounded-md">
                Error: ${error.message}
            </div>
        `;
    }
 }
 
 async function stake() {
    try {
        stakingLoader.style.display = 'block';
        const amount = stakeAmount.value;
        if (!amount || amount <= 0) throw new Error('Please enter a valid amount');
 
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const staking = new ethers.Contract(STAKING_ADDRESS, STAKING_ABI, signer);
        
        const tx = await staking.bondWithRewardDestination(ethers.parseEther(amount), 0);
        
        stakeResult.innerHTML = `
            <div class="p-4 bg-blue-100 text-blue-700 rounded-md">
                Transaction sent: <a href="https://zentrace.io/tx/${tx.hash}" target="_blank" class="underline">${tx.hash}</a>
            </div>
        `;
        
        await tx.wait();
        await updateAllInfo();
    } catch (error) {
        stakeResult.innerHTML = `
            <div class="p-4 bg-red-100 text-red-700 rounded-md">
                Error: ${error.message}
            </div>
        `;
    } finally {
        stakingLoader.style.display = 'none';
    }
 }
 
 async function bondExtra() {
    try {
        stakingLoader.style.display = 'block';
        const amount = stakeAmount.value;
        if (!amount || amount <= 0) throw new Error('Please enter a valid amount');
 
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const staking = new ethers.Contract(STAKING_ADDRESS, STAKING_ABI, signer);
        
        const tx = await staking.bondExtra(ethers.parseEther(amount));
        
        stakeResult.innerHTML = `
            <div class="p-4 bg-blue-100 text-blue-700 rounded-md">
                Transaction sent: <a href="https://zentrace.io/tx/${tx.hash}" target="_blank" class="underline">${tx.hash}</a>
            </div>
        `;
        
        await tx.wait();
        await updateAllInfo();
    } catch (error) {
        stakeResult.innerHTML = `
            <div class="p-4 bg-red-100 text-red-700 rounded-md">
                Error: ${error.message}
            </div>
        `;
    } finally {
        stakingLoader.style.display = 'none';
    }
 }
 
 async function unstake() {
    try {
        stakingLoader.style.display = 'block';
        const amount = unstakeAmount.value;
        if (!amount || amount <= 0) throw new Error('Please enter a valid amount');
 
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const staking = new ethers.Contract(STAKING_ADDRESS, STAKING_ABI, signer);
        
        const tx = await staking.unbond(ethers.parseEther(amount));
        
        unstakeResult.innerHTML = `
            <div class="p-4 bg-blue-100 text-blue-700 rounded-md">
                Transaction sent: <a href="https://zentrace.io/tx/${tx.hash}" target="_blank" class="underline">${tx.hash}</a>
            </div>
        `;
        
        await tx.wait();
        await updateAllInfo();
    } catch (error) {
        unstakeResult.innerHTML = `
            <div class="p-4 bg-red-100 text-red-700 rounded-md">
                Error: ${error.message}
            </div>
        `;
    } finally {
        stakingLoader.style.display = 'none';
    }
 }
 
 async function enableStakingButtons() {
    try {
        console.log("EnableStakingButtons started");
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        currentUserAddress = await signer.getAddress();
        
        await updateAllInfo();
        console.log("EnableStakingButtons completed");
    } catch (error) {
        console.error("Error in enableStakingButtons:", error);
    }
 }

 stakeButton.addEventListener('click', stake);
 unstakeButton.addEventListener('click', unstake);
 
 window.enableStakingButtons = enableStakingButtons;