(define-trait dao-adapter-trait
  (
    (execute
      (
        (tuple
          (kind (string-ascii 16))
          (amount uint)
          (recipient principal)
          (token (optional principal))
          (memo (optional (buff 34)))
        )
      )
      (response bool uint)
    )
  )
)
