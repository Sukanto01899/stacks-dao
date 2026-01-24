;; DAO core v3: governance with queued execution and adapter-based transfers.

(define-constant ERR_PROPOSAL_MISSING u100)
(define-constant ERR_VOTING_CLOSED u101)
(define-constant ERR_ALREADY_VOTED u102)
(define-constant ERR_ALREADY_EXECUTED u103)
(define-constant ERR_NOT_PASSED u104)
(define-constant ERR_EXECUTION_FAILED u105)
(define-constant ERR_INSUFFICIENT_POWER u106)
(define-constant ERR_INVALID_PAYLOAD u107)
(define-constant ERR_ALREADY_QUEUED u108)
(define-constant ERR_ALREADY_CANCELLED u109)
(define-constant ERR_NOT_QUEUED u110)
(define-constant ERR_TIMELOCK_ACTIVE u111)
(define-constant ERR_UNAUTHORIZED u112)
(define-constant ERR_INVALID_ADAPTER u113)
(define-constant ERR_HASH_MISMATCH u114)
(define-constant ERR_TOKEN_CALL u115)
(define-constant ERR_INVALID_CHOICE u116)

(define-constant CHOICE_AGAINST u0)
(define-constant CHOICE_FOR u1)
(define-constant CHOICE_ABSTAIN u2)

(define-constant BPS_DENOMINATOR u10000)
(define-constant PROPOSAL_THRESHOLD_BPS u100) ;; 1%
(define-constant QUORUM_BPS u1000) ;; 10%
(define-constant MIN_PROPOSAL_THRESHOLD u1)
(define-constant MIN_QUORUM u1)

(define-constant VOTING_PERIOD u2100)
(define-constant TIMELOCK_DELAY u100)

(define-constant GOVERNANCE_TOKEN .governance-token-v1)
(define-constant DEFAULT_ADAPTER .transfer-adapter-v1)

(define-data-var next-proposal-id uint u1)

(define-map proposals
  { id: uint }
  {
    proposer: principal,
    adapter: principal,
    adapter-hash: (buff 32),
    payload-hash: (buff 32),
    payload: (tuple
      (kind (string-ascii 16))
      (amount uint)
      (recipient principal)
      (token (optional principal))
      (memo (optional (buff 34)))
    ),
    start-height: uint,
    end-height: uint,
    eta: uint,
    for-votes: uint,
    against-votes: uint,
    abstain-votes: uint,
    queued: bool,
    executed: bool,
    cancelled: bool,
    snapshot-supply: uint,
    quorum: uint,
    threshold: uint,
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

(define-private (max-u (a uint) (b uint))
  (if (> a b) a b)
)

(define-private (get-token-balance (owner principal))
  (contract-call? GOVERNANCE_TOKEN get-balance owner)
)

(define-private (get-total-supply)
  (contract-call? GOVERNANCE_TOKEN get-total-supply)
)

(define-private (payload-hash (payload (tuple
  (kind (string-ascii 16))
  (amount uint)
  (recipient principal)
  (token (optional principal))
  (memo (optional (buff 34)))
)))
  (sha256 (unwrap-panic (to-consensus-buff? payload)))
)

(define-private (valid-payload (payload (tuple
  (kind (string-ascii 16))
  (amount uint)
  (recipient principal)
  (token (optional principal))
  (memo (optional (buff 34)))
)))
  (let ((amount (get amount payload)))
    (and (> amount u0)
      (or
        (and (is-eq (get kind payload) "stx-transfer") (is-none (get token payload)))
        (and (is-eq (get kind payload) "ft-transfer")
          (and (is-some (get token payload)) (is-eq (unwrap-panic (get token payload)) GOVERNANCE_TOKEN))
        )
      )
    )
  )
)

(define-private (proposal-passes-internal (proposal {
  proposer: principal,
  adapter: principal,
  adapter-hash: (buff 32),
  payload-hash: (buff 32),
  payload: (tuple
    (kind (string-ascii 16))
    (amount uint)
    (recipient principal)
    (token (optional principal))
    (memo (optional (buff 34)))
  ),
  start-height: uint,
  end-height: uint,
  eta: uint,
  for-votes: uint,
  against-votes: uint,
  abstain-votes: uint,
  queued: bool,
  executed: bool,
  cancelled: bool,
  snapshot-supply: uint,
  quorum: uint,
  threshold: uint,
}))
  (let (
      (for (get for-votes proposal))
      (against (get against-votes proposal))
      (abstain (get abstain-votes proposal))
      (participation (+ for (+ against abstain)))
    )
    (and (>= participation (get quorum proposal)) (> for against))
  )
)

(define-read-only (proposal-passes (proposal-id uint))
  (match (map-get? proposals { id: proposal-id })
    proposal (ok (proposal-passes-internal proposal))
    (err ERR_PROPOSAL_MISSING)
  )
)

(define-read-only (get-proposal (proposal-id uint))
  (map-get? proposals { id: proposal-id })
)

(define-read-only (get-receipt (proposal-id uint) (voter principal))
  (map-get? receipts { id: proposal-id, voter: voter })
)

(define-public (propose (payload (tuple
    (kind (string-ascii 16))
    (amount uint)
    (recipient principal)
    (token (optional principal))
    (memo (optional (buff 34)))
  ))
  )
  (let (
      (pid (var-get next-proposal-id))
      (supply (unwrap! (get-total-supply) (err ERR_TOKEN_CALL)))
      (threshold (max-u MIN_PROPOSAL_THRESHOLD (/ (* supply PROPOSAL_THRESHOLD_BPS) BPS_DENOMINATOR)))
      (quorum (max-u MIN_QUORUM (/ (* supply QUORUM_BPS) BPS_DENOMINATOR)))
      (power (unwrap! (get-token-balance tx-sender) (err ERR_TOKEN_CALL)))
    )
    (if (< power threshold)
      (err ERR_INSUFFICIENT_POWER)
      (if (not (valid-payload payload))
        (err ERR_INVALID_PAYLOAD)
        (let (
            (adapter-hash (unwrap! (contract-hash? DEFAULT_ADAPTER) (err ERR_INVALID_ADAPTER)))
            (hash (payload-hash payload))
          )
          (map-set proposals { id: pid } {
            proposer: tx-sender,
            adapter: DEFAULT_ADAPTER,
            adapter-hash: adapter-hash,
            payload-hash: hash,
            payload: payload,
            start-height: stacks-block-height,
            end-height: (+ stacks-block-height VOTING_PERIOD),
            eta: u0,
            for-votes: u0,
            against-votes: u0,
            abstain-votes: u0,
            queued: false,
            executed: false,
            cancelled: false,
            snapshot-supply: supply,
            quorum: quorum,
            threshold: threshold,
          })
          (var-set next-proposal-id (+ pid u1))
          (print {
            event: "propose",
            id: pid,
            proposer: tx-sender,
            start-height: stacks-block-height,
            end-height: (+ stacks-block-height VOTING_PERIOD),
          })
          (ok pid)
        )
      )
    )
  )
)

(define-public (cast-vote (proposal-id uint) (choice uint))
  (let ((proposal (unwrap! (map-get? proposals { id: proposal-id }) (err ERR_PROPOSAL_MISSING))))
    (if (or
        (get executed proposal)
        (get cancelled proposal)
        (< stacks-block-height (get start-height proposal))
        (> stacks-block-height (get end-height proposal))
      )
      (err ERR_VOTING_CLOSED)
      (if (is-some (map-get? receipts { id: proposal-id, voter: tx-sender }))
        (err ERR_ALREADY_VOTED)
        (if (or (is-eq choice CHOICE_FOR) (is-eq choice CHOICE_AGAINST) (is-eq choice CHOICE_ABSTAIN))
          (let (
            (weight (unwrap! (get-token-balance tx-sender) (err ERR_TOKEN_CALL)))
              (for-delta (if (is-eq choice CHOICE_FOR) weight u0))
              (against-delta (if (is-eq choice CHOICE_AGAINST) weight u0))
              (abstain-delta (if (is-eq choice CHOICE_ABSTAIN) weight u0))
            )
            (map-set receipts { id: proposal-id, voter: tx-sender } { choice: choice, weight: weight })
            (map-set proposals { id: proposal-id } {
              proposer: (get proposer proposal),
              adapter: (get adapter proposal),
              adapter-hash: (get adapter-hash proposal),
              payload-hash: (get payload-hash proposal),
              payload: (get payload proposal),
              start-height: (get start-height proposal),
              end-height: (get end-height proposal),
              eta: (get eta proposal),
              for-votes: (+ (get for-votes proposal) for-delta),
              against-votes: (+ (get against-votes proposal) against-delta),
              abstain-votes: (+ (get abstain-votes proposal) abstain-delta),
              queued: (get queued proposal),
              executed: (get executed proposal),
              cancelled: (get cancelled proposal),
              snapshot-supply: (get snapshot-supply proposal),
              quorum: (get quorum proposal),
              threshold: (get threshold proposal),
            })
            (print {
              event: "vote",
              id: proposal-id,
              voter: tx-sender,
              choice: choice,
              weight: weight,
            })
            (ok true)
          )
          (err ERR_INVALID_CHOICE)
        )
      )
    )
  )
)

(define-public (queue (proposal-id uint))
  (let ((proposal (unwrap! (map-get? proposals { id: proposal-id }) (err ERR_PROPOSAL_MISSING))))
    (if (get cancelled proposal)
      (err ERR_ALREADY_CANCELLED)
      (if (get executed proposal)
        (err ERR_ALREADY_EXECUTED)
        (if (get queued proposal)
          (err ERR_ALREADY_QUEUED)
          (if (< stacks-block-height (get end-height proposal))
            (err ERR_VOTING_CLOSED)
            (if (proposal-passes-internal proposal)
              (let ((eta (+ stacks-block-height TIMELOCK_DELAY)))
                (map-set proposals { id: proposal-id } {
                  proposer: (get proposer proposal),
                  adapter: (get adapter proposal),
                  adapter-hash: (get adapter-hash proposal),
                  payload-hash: (get payload-hash proposal),
                  payload: (get payload proposal),
                  start-height: (get start-height proposal),
                  end-height: (get end-height proposal),
                  eta: eta,
                  for-votes: (get for-votes proposal),
                  against-votes: (get against-votes proposal),
                  abstain-votes: (get abstain-votes proposal),
                  queued: true,
                  executed: (get executed proposal),
                  cancelled: (get cancelled proposal),
                  snapshot-supply: (get snapshot-supply proposal),
                  quorum: (get quorum proposal),
                  threshold: (get threshold proposal),
                })
                (print { event: "queue", id: proposal-id, eta: eta })
                (ok true)
              )
              (err ERR_NOT_PASSED)
            )
          )
        )
      )
    )
  )
)

(define-public (execute (proposal-id uint))
  (let ((proposal (unwrap! (map-get? proposals { id: proposal-id }) (err ERR_PROPOSAL_MISSING))))
    (if (get cancelled proposal)
      (err ERR_ALREADY_CANCELLED)
      (if (get executed proposal)
        (err ERR_ALREADY_EXECUTED)
        (if (not (get queued proposal))
          (err ERR_NOT_QUEUED)
          (if (< stacks-block-height (get eta proposal))
            (err ERR_TIMELOCK_ACTIVE)
            (let (
                (current-hash (unwrap! (contract-hash? DEFAULT_ADAPTER) (err ERR_INVALID_ADAPTER)))
                (payload (get payload proposal))
                (hash (payload-hash (get payload proposal)))
              )
              (if (not (is-eq (get adapter proposal) DEFAULT_ADAPTER))
                (err ERR_INVALID_ADAPTER)
                (if (not (is-eq current-hash (get adapter-hash proposal)))
                  (err ERR_HASH_MISMATCH)
                  (if (not (is-eq hash (get payload-hash proposal)))
                    (err ERR_HASH_MISMATCH)
                    (match (contract-call? DEFAULT_ADAPTER execute payload)
                      ok-result (begin
                        (map-set proposals { id: proposal-id } {
                          proposer: (get proposer proposal),
                          adapter: (get adapter proposal),
                          adapter-hash: (get adapter-hash proposal),
                          payload-hash: (get payload-hash proposal),
                          payload: payload,
                          start-height: (get start-height proposal),
                          end-height: (get end-height proposal),
                          eta: (get eta proposal),
                          for-votes: (get for-votes proposal),
                          against-votes: (get against-votes proposal),
                          abstain-votes: (get abstain-votes proposal),
                          queued: (get queued proposal),
                          executed: true,
                          cancelled: (get cancelled proposal),
                          snapshot-supply: (get snapshot-supply proposal),
                          quorum: (get quorum proposal),
                          threshold: (get threshold proposal),
                        })
                        (print { event: "execute", id: proposal-id })
                        (ok true)
                      )
                      err-code (err ERR_EXECUTION_FAILED)
                    )
                  )
                )
              )
            )
          )
        )
      )
    )
  )
)

(define-public (cancel (proposal-id uint))
  (let ((proposal (unwrap! (map-get? proposals { id: proposal-id }) (err ERR_PROPOSAL_MISSING))))
    (if (or (get executed proposal) (get cancelled proposal))
      (err ERR_ALREADY_CANCELLED)
      (let ((power (unwrap! (get-token-balance tx-sender) (err ERR_TOKEN_CALL))))
        (if (or (is-eq tx-sender (get proposer proposal)) (>= power (get threshold proposal)))
          (begin
            (map-set proposals { id: proposal-id } {
              proposer: (get proposer proposal),
              adapter: (get adapter proposal),
              adapter-hash: (get adapter-hash proposal),
              payload-hash: (get payload-hash proposal),
              payload: (get payload proposal),
              start-height: (get start-height proposal),
              end-height: (get end-height proposal),
              eta: (get eta proposal),
              for-votes: (get for-votes proposal),
              against-votes: (get against-votes proposal),
              abstain-votes: (get abstain-votes proposal),
              queued: (get queued proposal),
              executed: (get executed proposal),
              cancelled: true,
              snapshot-supply: (get snapshot-supply proposal),
              quorum: (get quorum proposal),
              threshold: (get threshold proposal),
            })
            (print { event: "cancel", id: proposal-id })
            (ok true)
          )
          (err ERR_UNAUTHORIZED)
        )
      )
    )
  )
)
