export async function sleep(mills: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, mills);
  })
}
