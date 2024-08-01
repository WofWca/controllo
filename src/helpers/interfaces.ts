interface IControlloData {
  service: string
  amount: string
  frecuency: "monthly" | "yearly"
  date: string
  serviceLink: string
  payDay: string
}

export { IControlloData }
