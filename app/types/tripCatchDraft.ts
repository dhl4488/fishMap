export interface CatchDraft {
  id: number
  species: string
  quantity: number
  lureId: number | ''
  individualDetails: boolean
  length: string
  weight: string
  releaseStatus: '' | 'released' | 'kept'
  photo?: string
  photoFile: File | null
  removePhoto: boolean
  photoError: string
}
