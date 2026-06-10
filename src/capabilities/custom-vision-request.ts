/** Custom LLM adapter：模板未声明 images 时仍注入 vision 图片数组 */
export function attachCustomVisionImages(
  requestBody: Record<string, unknown>,
  images?: string[],
): void {
  if (images?.length && requestBody.images === undefined) {
    requestBody.images = images
  }
}
