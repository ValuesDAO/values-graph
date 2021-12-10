import { Address, BigDecimal, BigInt, log } from '@graphprotocol/graph-ts'
import { ValuesERC20 } from '../../generated/ValuesTreasury/ValuesERC20'
import { ValuesStakedERC20 } from '../../generated/ValuesStakedERC20/ValuesStakedERC20'
import { ValuesStaking } from '../../generated/ValuesTreasury/ValuesStaking'
import { ValuesCirculatingSupply } from '../../generated/ValuesTreasury/ValuesCirculatingSupply'
import { ERC20 } from '../../generated/ValuesTreasury/ERC20'
import { UniswapV2Pair } from '../../generated/ValuesTreasury/UniswapV2Pair'

import { ProtocolMetric, Transaction } from '../../generated/schema'
import {
  CIRCULATING_SUPPLY_CONTRACT,
  CIRCULATING_SUPPLY_CONTRACT_BLOCK,
  MAI_ERC20_CONTRACT,
  VALUES_ERC20_CONTRACT,
  SVALUES_ERC20_CONTRACT,
  STAKING_CONTRACT,
  TREASURY_ADDRESS,
  UNI_VALUES_MAI_PAIR,
} from './Constants'
import { dayFromTimestamp } from './Dates'
import { toDecimal } from './Decimals'
import { getVALUESUSDRate, getDiscountedPairUSD, getPairUSD } from './Price'

export function loadOrCreateProtocolMetric(timestamp: BigInt): ProtocolMetric {
  let dayTimestamp = dayFromTimestamp(timestamp)

  let protocolMetric = ProtocolMetric.load(dayTimestamp)
  if (protocolMetric == null) {
    protocolMetric = new ProtocolMetric(dayTimestamp)
    protocolMetric.timestamp = timestamp
    protocolMetric.valuesCirculatingSupply = BigDecimal.fromString('0')
    protocolMetric.sValuesCirculatingSupply = BigDecimal.fromString('0')
    protocolMetric.totalSupply = BigDecimal.fromString('0')
    protocolMetric.valuesPrice = BigDecimal.fromString('0')
    protocolMetric.marketCap = BigDecimal.fromString('0')
    protocolMetric.totalValueLocked = BigDecimal.fromString('0')
    protocolMetric.treasuryRiskFreeValue = BigDecimal.fromString('0')
    protocolMetric.treasuryMarketValue = BigDecimal.fromString('0')
    protocolMetric.nextEpochRebase = BigDecimal.fromString('0')
    protocolMetric.nextDistributedValues = BigDecimal.fromString('0')
    protocolMetric.currentAPY = BigDecimal.fromString('0')
    protocolMetric.treasuryMaiRiskFreeValue = BigDecimal.fromString('0')
    protocolMetric.treasuryMaiMarketValue = BigDecimal.fromString('0')
    // protocolMetric.treasuryFraxRiskFreeValue = BigDecimal.fromString('0')
    // protocolMetric.treasuryFraxMarketValue = BigDecimal.fromString('0')
    // protocolMetric.treasuryWmaticRiskFreeValue = BigDecimal.fromString('0')
    // protocolMetric.treasuryWmaticMarketValue = BigDecimal.fromString('0')
    protocolMetric.treasuryValuesMaiPOL = BigDecimal.fromString('0')
    // protocolMetric.treasuryValuesFraxPOL = BigDecimal.fromString('0')
    // protocolMetric.treasuryValuesWmaticPOL = BigDecimal.fromString('0')

    protocolMetric.save()
  }
  return protocolMetric as ProtocolMetric
}

function getTotalSupply(): BigDecimal {
  let values_contract = ValuesERC20.bind(
    Address.fromString(VALUES_ERC20_CONTRACT),
  )
  let total_supply = toDecimal(values_contract.totalSupply(), 9)
  log.debug('Total Supply {}', [total_supply.toString()])
  return total_supply
}

function getCirculatingSupply(
  transaction: Transaction,
  total_supply: BigDecimal,
): BigDecimal {
  let circ_supply = BigDecimal.fromString('0')
  if (
    transaction.blockNumber.gt(
      BigInt.fromString(CIRCULATING_SUPPLY_CONTRACT_BLOCK),
    )
  ) {
    let circulatingSupply_contract = ValuesCirculatingSupply.bind(
      Address.fromString(CIRCULATING_SUPPLY_CONTRACT),
    )
    circ_supply = toDecimal(
      circulatingSupply_contract.VALUESCirculatingSupply(),
      9,
    )
  } else {
    circ_supply = total_supply
  }
  log.debug('Circulating Supply {}', [total_supply.toString()])
  return circ_supply
}

function getSValuesSupply(transaction: Transaction): BigDecimal {
  let svalues_supply = BigDecimal.fromString('0')

  let svalues_contract = ValuesStakedERC20.bind(
    Address.fromString(SVALUES_ERC20_CONTRACT),
  )
  svalues_supply = toDecimal(svalues_contract.circulatingSupply(), 9)

  log.debug('sVALUES Supply {}', [svalues_supply.toString()])
  return svalues_supply
}

function getMV_RFV(transaction: Transaction): BigDecimal[] {
  let maiERC20 = ERC20.bind(Address.fromString(MAI_ERC20_CONTRACT))
  // let fraxERC20 = ERC20.bind(Address.fromString(FRAX_ERC20_CONTRACT))
  // let maticERC20 = ERC20.bind(Address.fromString(MATIC_ERC20_CONTRACT))

  let valuesMaiPair = UniswapV2Pair.bind(
    Address.fromString(UNI_VALUES_MAI_PAIR),
  )
  // let valuesFraxPair = UniswapV2Pair.bind(
  //   Address.fromString(UNI_VALUES_FRAX_PAIR),
  // )
  // let valuesWmaticPair = UniswapV2Pair.bind(
  //   Address.fromString(UNI_VALUES_WMATIC_PAIR),
  // )

  let treasury_address = TREASURY_ADDRESS
  let maiBalance = maiERC20.balanceOf(Address.fromString(treasury_address))
  // let fraxBalance = fraxERC20.balanceOf(Address.fromString(treasury_address))

  // let wmaticBalance = maticERC20.balanceOf(Address.fromString(treasury_address))
  // let wmatic_value = toDecimal(wmaticBalance, 18).times(getWMATICUSDRate())

  //VALUES-MAI
  let valuesMaiBalance = valuesMaiPair.balanceOf(
    Address.fromString(treasury_address),
  )
  let valuesMaiTotalLP = toDecimal(valuesMaiPair.totalSupply(), 18)
  let valuesMaiPOL = toDecimal(valuesMaiBalance, 18)
    .div(valuesMaiTotalLP)
    .times(BigDecimal.fromString('100'))
  let valuesMai_value = getPairUSD(valuesMaiBalance, UNI_VALUES_MAI_PAIR)
  let valuesMai_rfv = getDiscountedPairUSD(
    valuesMaiBalance,
    UNI_VALUES_MAI_PAIR,
  )

  // //VALUES-FRAX
  // let valuesFraxBalance = BigInt.fromI32(0)
  // let valuesFrax_value = BigDecimal.fromString('0')
  // let valuesFrax_rfv = BigDecimal.fromString('0')
  // let valuesFraxTotalLP = BigDecimal.fromString('0')
  // let valuesFraxPOL = BigDecimal.fromString('0')
  // if (
  //   transaction.blockNumber.gt(BigInt.fromString(UNI_VALUES_FRAX_PAIR_BLOCK))
  // ) {
  //   valuesFraxBalance = valuesFraxPair.balanceOf(
  //     Address.fromString(treasury_address),
  //   )
  //   valuesFrax_value = getPairUSD(valuesFraxBalance, UNI_VALUES_FRAX_PAIR)
  //   valuesFrax_rfv = getDiscountedPairUSD(
  //     valuesFraxBalance,
  //     UNI_VALUES_FRAX_PAIR,
  //   )
  //   valuesFraxTotalLP = toDecimal(valuesFraxPair.totalSupply(), 18)
  //   if (
  //     valuesFraxTotalLP.gt(BigDecimal.fromString('0')) &&
  //     valuesFraxBalance.gt(BigInt.fromI32(0))
  //   ) {
  //     valuesFraxPOL = toDecimal(valuesFraxBalance, 18)
  //       .div(valuesFraxTotalLP)
  //       .times(BigDecimal.fromString('100'))
  //   }
  // }

  // //OHMETH
  // let valuesWmatic = BigInt.fromI32(0)
  // let valuesWmatic_value = BigDecimal.fromString('0')
  // let valuesWmatic_rfv = BigDecimal.fromString('0')
  // let valuesWmaticTotalLP = BigDecimal.fromString('0')
  // let valuesWmaticPOL = BigDecimal.fromString('0')
  // if (
  //   transaction.blockNumber.gt(BigInt.fromString(UNI_VALUES_WMATIC_PAIR_BLOCK))
  // ) {
  //   valuesWmatic = valuesWmaticPair.balanceOf(
  //     Address.fromString(treasury_address),
  //   )
  //   log.debug('valuesMaticBalance {}', [valuesWmatic.toString()])

  //   valuesWmatic_value = getPairWMATIC(valuesWmatic, UNI_VALUES_WMATIC_PAIR)
  //   log.debug('valuesWmatic_value {}', [valuesWmatic_value.toString()])

  //   valuesWmatic_rfv = getDiscountedPairUSD(
  //     valuesWmatic,
  //     UNI_VALUES_WMATIC_PAIR,
  //   )
  //   valuesWmaticTotalLP = toDecimal(valuesWmaticPair.totalSupply(), 18)
  //   if (
  //     valuesWmaticTotalLP.gt(BigDecimal.fromString('0')) &&
  //     valuesWmatic.gt(BigInt.fromI32(0))
  //   ) {
  //     valuesWmaticPOL = toDecimal(valuesWmatic, 18)
  //       .div(valuesWmaticTotalLP)
  //       .times(BigDecimal.fromString('100'))
  //   }
  // }

  let stableValue = maiBalance
  let stableValueDecimal = toDecimal(stableValue, 18)

  let lpValue = valuesMai_value
  let rfvLpValue = valuesMai_rfv

  let mv = stableValueDecimal.plus(lpValue)
  let rfv = stableValueDecimal.plus(rfvLpValue)

  log.debug('Treasury Market Value {}', [mv.toString()])
  log.debug('Treasury RFV {}', [rfv.toString()])
  log.debug('Treasury MAI value {}', [toDecimal(maiBalance, 18).toString()])
  log.debug('Treasury VALUES-MAI RFV {}', [valuesMai_rfv.toString()])

  return [
    mv,
    rfv,
    // treasuryMaiRiskFreeValue = MAI RFV * MAI + aMAI
    valuesMai_rfv.plus(toDecimal(maiBalance, 18)),
    // treasuryMaiMarketValue = MAI LP * MAI + aMAI
    valuesMai_value.plus(toDecimal(maiBalance, 18)),
    // treasuryFraxRiskFreeValue = FRAX RFV * FRAX
    // valuesFrax_rfv.plus(toDecimal(fraxBalance, 18)),
    // treasuryFraxMarketValue = FRAX LP * FRAX
    // valuesFrax_value.plus(toDecimal(fraxBalance, 18)),
    // valuesWmatic_rfv.plus(wmatic_value),
    // valuesWmatic_value.plus(wmatic_value),
    // POL
    valuesMaiPOL,
  ]
}

function getNextVALUESRebase(transaction: Transaction): BigDecimal {
  let staking_contract = ValuesStaking.bind(
    Address.fromString(STAKING_CONTRACT),
  )
  let distribution_v1 = toDecimal(staking_contract.epoch().value3, 9)
  log.debug('next_distribution v2 {}', [distribution_v1.toString()])
  let next_distribution = distribution_v1
  log.debug('next_distribution total {}', [next_distribution.toString()])
  return next_distribution
}

function getAPY_Rebase(
  sVALUES: BigDecimal,
  distributedVALUES: BigDecimal,
): BigDecimal[] {
  let nextEpochRebase = distributedVALUES
    .div(sVALUES)
    .times(BigDecimal.fromString('100'))

  let nextEpochRebase_number = Number.parseFloat(nextEpochRebase.toString())
  let currentAPY = Math.pow(nextEpochRebase_number / 100 + 1, 365 * 3 - 1) * 100

  let currentAPYdecimal = BigDecimal.fromString(currentAPY.toString())

  log.debug('next_rebase {}', [nextEpochRebase.toString()])
  log.debug('current_apy total {}', [currentAPYdecimal.toString()])

  return [currentAPYdecimal, nextEpochRebase]
}

function getRunway(
  sVALUES: BigDecimal,
  rfv: BigDecimal,
  rebase: BigDecimal,
): BigDecimal[] {
  let runway2dot5k = BigDecimal.fromString('0')
  let runway5k = BigDecimal.fromString('0')
  let runway7dot5k = BigDecimal.fromString('0')
  let runway10k = BigDecimal.fromString('0')
  let runway20k = BigDecimal.fromString('0')
  let runway50k = BigDecimal.fromString('0')
  let runway70k = BigDecimal.fromString('0')
  let runway100k = BigDecimal.fromString('0')
  let runwayCurrent = BigDecimal.fromString('0')

  if (
    sVALUES.gt(BigDecimal.fromString('0')) &&
    rfv.gt(BigDecimal.fromString('0')) &&
    rebase.gt(BigDecimal.fromString('0'))
  ) {
    let treasury_runway = Number.parseFloat(rfv.div(sVALUES).toString())

    let runway2dot5k_num =
      Math.log(treasury_runway) / Math.log(1 + 0.0029438) / 3
    let runway5k_num = Math.log(treasury_runway) / Math.log(1 + 0.003579) / 3
    let runway7dot5k_num =
      Math.log(treasury_runway) / Math.log(1 + 0.0039507) / 3
    let runway10k_num = Math.log(treasury_runway) / Math.log(1 + 0.00421449) / 3
    let runway20k_num = Math.log(treasury_runway) / Math.log(1 + 0.00485037) / 3
    let runway50k_num = Math.log(treasury_runway) / Math.log(1 + 0.00569158) / 3
    let runway70k_num = Math.log(treasury_runway) / Math.log(1 + 0.00600065) / 3
    let runway100k_num =
      Math.log(treasury_runway) / Math.log(1 + 0.00632839) / 3
    let nextEpochRebase_number = Number.parseFloat(rebase.toString()) / 100
    let runwayCurrent_num =
      Math.log(treasury_runway) / Math.log(1 + nextEpochRebase_number) / 3

    runway2dot5k = BigDecimal.fromString(runway2dot5k_num.toString())
    runway5k = BigDecimal.fromString(runway5k_num.toString())
    runway7dot5k = BigDecimal.fromString(runway7dot5k_num.toString())
    runway10k = BigDecimal.fromString(runway10k_num.toString())
    runway20k = BigDecimal.fromString(runway20k_num.toString())
    runway50k = BigDecimal.fromString(runway50k_num.toString())
    runway70k = BigDecimal.fromString(runway70k_num.toString())
    runway100k = BigDecimal.fromString(runway100k_num.toString())
    runwayCurrent = BigDecimal.fromString(runwayCurrent_num.toString())
  }

  return [
    runway2dot5k,
    runway5k,
    runway7dot5k,
    runway10k,
    runway20k,
    runway50k,
    runway70k,
    runway100k,
    runwayCurrent,
  ]
}

export function updateProtocolMetrics(transaction: Transaction): void {
  let pm = loadOrCreateProtocolMetric(transaction.timestamp)

  //Total Supply
  pm.totalSupply = getTotalSupply()

  //Circ Supply
  pm.valuesCirculatingSupply = getCirculatingSupply(transaction, pm.totalSupply)

  //sValues Supply
  pm.sValuesCirculatingSupply = getSValuesSupply(transaction)

  //VALUES Price
  pm.valuesPrice = getVALUESUSDRate()

  //VALUES Market Cap
  pm.marketCap = pm.valuesCirculatingSupply.times(pm.valuesPrice)

  //Total Value Locked
  pm.totalValueLocked = pm.sValuesCirculatingSupply.times(pm.valuesPrice)

  //Treasury RFV and MV
  let mv_rfv = getMV_RFV(transaction)
  pm.treasuryMarketValue = mv_rfv[0]
  pm.treasuryRiskFreeValue = mv_rfv[1]
  pm.treasuryMaiRiskFreeValue = mv_rfv[2]
  pm.treasuryMaiMarketValue = mv_rfv[3]
  // pm.treasuryFraxRiskFreeValue = mv_rfv[4]
  // pm.treasuryFraxMarketValue = mv_rfv[5]
  // pm.treasuryWmaticRiskFreeValue = mv_rfv[6]
  // pm.treasuryWmaticMarketValue = mv_rfv[7]
  pm.treasuryValuesMaiPOL = mv_rfv[8]
  // pm.treasuryValuesFraxPOL = mv_rfv[9]
  // pm.treasuryValuesWmaticPOL = mv_rfv[10]

  // Rebase rewards, APY, rebase
  pm.nextDistributedValues = getNextVALUESRebase(transaction)
  let apy_rebase = getAPY_Rebase(
    pm.sValuesCirculatingSupply,
    pm.nextDistributedValues,
  )
  pm.currentAPY = apy_rebase[0]
  pm.nextEpochRebase = apy_rebase[1]

  //Runway
  let runways = getRunway(
    pm.sValuesCirculatingSupply,
    pm.treasuryRiskFreeValue,
    pm.nextEpochRebase,
  )
  pm.runway2dot5k = runways[0]
  pm.runway5k = runways[1]
  pm.runway7dot5k = runways[2]
  pm.runway10k = runways[3]
  pm.runway20k = runways[4]
  pm.runway50k = runways[5]
  pm.runway70k = runways[6]
  pm.runway100k = runways[7]
  pm.runwayCurrent = runways[8]

  pm.save()
}
