export function ip2int(ip: string) {
  // Takes an IP address and returns an integer
  // Returns null if the IP is invalid
  // ex: ip2int("92.15.73.35") -> 1544505635
  try {
    let num = ip
      .split(".")
      .reduce(
        (acc: number, current: string) => (acc << 8) + parseInt(current),
        0
      );
    return num;
  } catch (e) {
    return null;
  }
}

export function int2ip(num: number) {
  // Takes an integer and returns an IP address
  // ex: int2ip(1544505635) -> "92.15.73.35"
  const octets = [];
  for (let i = 0; i < 4; i++) {
    octets.unshift(num & 255);
    num >>= 8;
  }
  return octets.join(".");
}

export function promiseWithTimeout(
  promise: Promise<any>,
  ms: number,
  timeoutError = new Error("Promise timed out")
) {
  // stolen from https://dev.to/nikosanif/create-promises-with-timeout-error-in-typescript-fmm
  // thanks nikosanif!
  // create a promise that rejects in milliseconds
  const timeout = new Promise((_, reject) => {
    setTimeout(() => {
      reject(timeoutError);
    }, ms);
  });

  // returns a race between timeout and the passed promise
  return Promise.race([promise, timeout]);
}

export function sleep(ms: number) {
  // copilot stole this off of the internet lol
  return new Promise((resolve) => setTimeout(resolve, ms));
}
