const STAKING_ABI = [
    "function status(address who) external view returns (uint8)",
    "function currentEra() external view returns (uint256)",
    "function activeEra() external view returns (uint256)",
    "function validatorPrefs(address who) external view returns (uint256, bool)",
    "function erasValidatorTotalStake(uint32 eraIndex, address validatorStash) external view returns (uint256 totalStake, uint256 ownStake)",
    "function erasValidatorNominatorsCount(uint32 eraIndex, address validatorStash) external view returns (uint32 numNominators, uint32 numPages)",
    "function erasValidatorPrefs(uint32 eraIndex, address validatorStash) external view returns (uint256 commission, bool blocked)",
    "function erasValidatorRewardPoints(uint32 eraIndex, address validatorStash) external view returns (uint256)",
    "function erasTotalRewardPoints(uint32 eraIndex) external view returns (uint256)",
    "function erasTotalStake(uint32 eraIndex) external view returns (uint256)",
    "function minActiveStake() external view returns (uint256)",
    "function historyDepth() external view returns (uint256)",
    "function erasValidatorNominationPageNominatorExposure(uint32 eraIndex, address validatorStash, uint32 pageIndex, uint32 nominationIndex) external view returns (address who, uint256 value)"
];

const STAKING_ADDRESS = "0x0000000000000000000000000000000000000800";

let currentValidatorAddress = "";
let currentUserAddress = null;

async function updateAllInfo() {
    try {
        console.log("UpdateAllInfo started");
        const provider = new ethers.BrowserProvider(window.ethereum);
        const staking = new ethers.Contract(STAKING_ADDRESS, STAKING_ABI, provider);
        
        await updateDashboard(currentValidatorAddress, staking);
    } catch (error) {
        console.error("Error updating info:", error);
    }
}

async function updateDashboard(validatorAddress, staking) {
    try {
        const currentEra = await staking.currentEra();
        const activeEra = await staking.activeEra();
        console.log("Eras:", { currentEra: currentEra.toString(), activeEra: activeEra.toString() });
    
        const [eraPrefsCommission, eraPrefsBlocked] = await staking.erasValidatorPrefs(activeEra, validatorAddress);
        const rewardPoints = await staking.erasValidatorRewardPoints(activeEra, validatorAddress);
        const [totalStake, ownStake] = await staking.erasValidatorTotalStake(activeEra, validatorAddress);
    
        try {
            const totalRewardPoints = await staking.erasTotalRewardPoints(activeEra);
            const eraTotalStake = await staking.erasTotalStake(activeEra);
            const minActive = await staking.minActiveStake();
    
            console.log("Popularity Metrics:", {
                pointsRatio: {
                    validator: rewardPoints.toString(),
                    total: totalRewardPoints.toString(),
                    percentage: ((Number(rewardPoints) * 100) / Number(totalRewardPoints)).toFixed(2) + '%'
                },
                stakeRatio: {
                    validator: ethers.formatEther(totalStake),
                    total: ethers.formatEther(eraTotalStake),
                    percentage: ((Number(totalStake) * 100) / Number(eraTotalStake)).toFixed(2) + '%'
                },
                stakeVsMin: {
                    stake: ethers.formatEther(totalStake),
                    minimum: ethers.formatEther(minActive),
                    ratio: (Number(totalStake) / Number(minActive)).toFixed(2) + 'x'
                }
            });
        } catch (error) {
            console.log("Error fetching popularity metrics:", error.message);
        }

        const validatorStatus = await staking.status(validatorAddress);
        const statusText = {
            0: "Inactive",
            1: "Nominator",
            2: "Validator",
            3: "Idle"
        }[validatorStatus];
        console.log("Validator status:", validatorStatus, "->", statusText);

        const [commission, blocked] = await staking.validatorPrefs(validatorAddress);
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
        nominatorsList.innerHTML = "";
        
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

                try {


                    

                    console.log("Starting history load");
                    document.getElementById('historyLoader').style.display = 'block';
                    document.getElementById('historyContent').style.display = 'none';
                    
                    const historyDepth = await staking.historyDepth();
                    console.log("History depth:", historyDepth.toString());
                    
                    const tableBody = document.getElementById('historyTableBody');
                    const currentEraNum = Number(currentEra);
                    const startEra = Math.max(currentEraNum - 2, 0);
                    console.log("Era range:", {currentEraNum, startEra});
                
                    tableBody.innerHTML = '';
                    let tableContent = '';
                
                    for(let era = currentEraNum; era >= startEra; era--) {

                        try {
                            const [numNominators] = await staking.erasValidatorNominatorsCount(era, validatorAddress);
                            console.log("Loading era:", era);
                            const validatorPoints = await staking.erasValidatorRewardPoints(era, validatorAddress);
                            const totalPoints = await staking.erasTotalRewardPoints(era);
                            
                            if (Number(validatorPoints) > 0) {
                                
                                tableContent += `
                                    <tr class="hover:bg-gray-50">
                                        <td class="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">${era}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">${validatorPoints.toString()}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">${totalPoints.toString()}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">${Number(numNominators)}</td>
                                    </tr>
                                `;
                            }
                        } catch (error) {
                            console.log(`Error loading era ${era}:`, error);
                        }
                    }
                
                    console.log("Finished loading all eras");
                    tableBody.innerHTML = tableContent;
                    
                    document.getElementById('historyLoader').style.display = 'none';
                    document.getElementById('historyContent').style.display = 'block';
                    console.log("Display updated");
                
                } catch (error) {
                    console.log("Error loading history:", error);
                    document.getElementById('historyLoader').style.display = 'none';
                }
                        

    } catch (error) {
        document.getElementById('validatorStats').innerHTML = `
            <div class="p-4 bg-red-100 text-red-700 rounded-md">
            ${error.message}
            </div>
        `;
        const noValidator = true;
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

window.enableStakingButtons = enableStakingButtons;


