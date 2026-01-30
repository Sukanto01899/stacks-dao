;; Simple DAO core v4 (testing-only): locked-STX snapshot voting, treasury execution, and timelock.

(define-constant ERR_PROPOSAL_MISSING u100)
(define-constant ERR_VOTING_CLOSED u101)
(define-constant ERR_ALREADY_VOTED u102)
(define-constant ERR_ALREADY_EXECUTED u103)
(define-constant ERR_NOT_PASSED u104)
(define-constant ERR_TRANSFER_FAILED u105)
(define-constant ERR_INSUFFICIENT_POWER u106)
(define-constant ERR_ACTIVE_PROPOSAL u107)
(define-constant ERR_INVALID_CHOICE u108)
(define-constant ERR_TIMELOCK u109)
(define-constant ERR_INVALID_AMOUNT u110)

(define-constant CHOICE_AGAINST u0)
(define-constant CHOICE_FOR u1)

(define-constant VOTING_PERIOD u1440)
(define-constant MIN_QUORUM u1000000)
(define-constant PROPOSAL_THRESHOLD u1000000)
(define-constant EXECUTION_DELAY u144)
(define-constant EXECUTION_WINDOW u1440)

(define-data-var next-proposal-id uint u1)
(define-data-var last-proposal-end-height uint u0)

(define-map proposals
  { id: uint }
  {
    proposer: principal,
    recipient: principal,
    amount: uint,
    start-height: uint,
    end-height: uint,
    execute-after: uint,
    execute-before: uint,
    for-votes: uint,
    against-votes: uint,
    executed: bool,
  }
)

(define-map receipts
  {
    id: uint,
    voter: principal,
  }
  {
    choice: uint,
    weight: uint,
  }
)

(define-map locked
  { voter: principal }
  { balance: uint }
)

(define-private (get-locked (who principal))
  (default-to u0 (get balance (map-get? locked { voter: who })))
)

(define-private (proposal-passes (proposal {
  proposer: principal,
  recipient: principal,
  amount: uint,
  start-height: uint,
  end-height: uint,
  execute-after: uint,
  execute-before: uint,
  for-votes: uint,
  against-votes: uint,
  executed: bool,
}))
  (let (
      (for (get for-votes proposal))
      (against (get against-votes proposal))
    )
    (and (>= for MIN_QUORUM) (> for against))
  )
)

(define-read-only (get-proposal (proposal-id uint))
  (map-get? proposals { id: proposal-id })
)

(define-read-only (get-locked-balance (who principal))
  (get-locked who)
)

(define-public (lock-stx (amount uint))
  (if (<= amount u0)
    (err ERR_INVALID_AMOUNT)
    (if (<= stacks-block-height (var-get last-proposal-end-height))
      (err ERR_ACTIVE_PROPOSAL)
      (match (stx-transfer? amount tx-sender (as-contract tx-sender))
        ok-result (begin
          (map-set locked { voter: tx-sender } { balance: (+ (get-locked tx-sender) amount) })
          (ok ok-result)
        )
        err-code (err ERR_TRANSFER_FAILED)
      )
    )
  )
)

(define-public (unlock-stx (amount uint))
  (let ((current (get-locked tx-sender)))
    (if (or (<= amount u0) (> amount current))
      (err ERR_INVALID_AMOUNT)
      (if (<= stacks-block-height (var-get last-proposal-end-height))
        (err ERR_ACTIVE_PROPOSAL)
        (match (as-contract (stx-transfer? amount tx-sender tx-sender))
          ok-result (begin
            (map-set locked { voter: tx-sender } { balance: (- current amount) })
            (ok ok-result)
          )
          err-code (err ERR_TRANSFER_FAILED)
        )
      )
    )
  )
)

(define-public (propose
    (recipient principal)
    (amount uint)
  )
  (let (
      (pid (var-get next-proposal-id))
      (power (get-locked tx-sender))
      (now stacks-block-height)
    )
    (if (<= now (var-get last-proposal-end-height))
      (err ERR_ACTIVE_PROPOSAL)
      (if (or (< power PROPOSAL_THRESHOLD) (<= amount u0))
        (err ERR_INSUFFICIENT_POWER)
        (let (
            (end-height (+ now VOTING_PERIOD))
            (execute-after (+ now VOTING_PERIOD EXECUTION_DELAY))
            (execute-before (+ now VOTING_PERIOD EXECUTION_DELAY EXECUTION_WINDOW))
          )
          (map-set proposals { id: pid } {
            proposer: tx-sender,
            recipient: recipient,
            amount: amount,
            start-height: now,
            end-height: end-height,
            execute-after: execute-after,
            execute-before: execute-before,
            for-votes: u0,
            against-votes: u0,
            executed: false,
          })
          (var-set next-proposal-id (+ pid u1))
          (var-set last-proposal-end-height end-height)
          (ok pid)
        )
      )
    )
  )
)

(define-public (cast-vote
    (proposal-id uint)
    (choice uint)
  )
  (let ((proposal (unwrap! (map-get? proposals { id: proposal-id }) (err ERR_PROPOSAL_MISSING))))
    (if (or
        (get executed proposal)
        (< stacks-block-height (get start-height proposal))
        (> stacks-block-height (get end-height proposal))
      )
      (err ERR_VOTING_CLOSED)
      (if (or (is-eq choice CHOICE_FOR) (is-eq choice CHOICE_AGAINST))
        (if (is-some (map-get? receipts {
            id: proposal-id,
            voter: tx-sender,
          }))
          (err ERR_ALREADY_VOTED)
          (let (
              (weight (get-locked tx-sender))
              (for-delta (if (is-eq choice CHOICE_FOR)
                weight
                u0
              ))
              (against-delta (if (is-eq choice CHOICE_AGAINST)
                weight
                u0
              ))
            )
            (map-set receipts {
              id: proposal-id,
              voter: tx-sender,
            } {
              choice: choice,
              weight: weight,
            })
            (map-set proposals { id: proposal-id } {
              proposer: (get proposer proposal),
              recipient: (get recipient proposal),
              amount: (get amount proposal),
              start-height: (get start-height proposal),
              end-height: (get end-height proposal),
              execute-after: (get execute-after proposal),
              execute-before: (get execute-before proposal),
              for-votes: (+ (get for-votes proposal) for-delta),
              against-votes: (+ (get against-votes proposal) against-delta),
              executed: (get executed proposal),
            })
            (ok true)
          )
        )
        (err ERR_INVALID_CHOICE)
      )
    )
  )
)

(define-public (execute (proposal-id uint))
  (let ((proposal (unwrap! (map-get? proposals { id: proposal-id }) (err ERR_PROPOSAL_MISSING))))
    (if (get executed proposal)
      (err ERR_ALREADY_EXECUTED)
      (if (< stacks-block-height (get execute-after proposal))
        (err ERR_TIMELOCK)
        (if (> stacks-block-height (get execute-before proposal))
          (err ERR_VOTING_CLOSED)
          (if (proposal-passes proposal)
            (match (as-contract (stx-transfer? (get amount proposal) tx-sender
              (get recipient proposal)
            ))
              ok-result (begin
                (map-set proposals { id: proposal-id } {
                  proposer: (get proposer proposal),
                  recipient: (get recipient proposal),
                  amount: (get amount proposal),
                  start-height: (get start-height proposal),
                  end-height: (get end-height proposal),
                  execute-after: (get execute-after proposal),
                  execute-before: (get execute-before proposal),
                  for-votes: (get for-votes proposal),
                  against-votes: (get against-votes proposal),
                  executed: true,
                })
                (ok ok-result)
              )
              err-code (err ERR_TRANSFER_FAILED)
            )
            (err ERR_NOT_PASSED)
          )
        )
      )
    )
  )
)
