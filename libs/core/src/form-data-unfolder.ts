export type UnfoldFormDataValue = FormDataEntryValue | FormDataEntryValue[] | UnfoldFormData;

export type UnfoldFormData = {
  [Key in string]: UnfoldFormDataValue;
};

export type FormDataToObjectOptions = {
  propertyStartDelimiter: string;
  propertyEndDelimiter: string;
  indexStartDelimiter: string;
  indexEndDelimiter: string;
};

const defaultUnfoldFormDataOptions = {
  indexEndDelimiter: "]",
  indexStartDelimiter: "[",
  propertyEndDelimiter: "",
  propertyStartDelimiter: ".",
};

export const unfoldFormData = (
  formData: FormData,
  options: FormDataToObjectOptions | undefined = defaultUnfoldFormDataOptions,
) => {
  const result: UnfoldFormData = {};
  const splitRegExp = new RegExp(
    `(?:${[
      options.propertyStartDelimiter,
      options.propertyEndDelimiter,
      options.indexStartDelimiter,
      options.indexEndDelimiter,
    ]
      .filter((delimiter) => delimiter !== "")
      .map((delimiter) => RegExp.escape(delimiter))
      .join("|")})+`,
  );

  [...formData.keys()].forEach((key) => {
    const path = key.split(splitRegExp);
    let base = result;

    path.forEach((chunk, index) => {
      if (index === path.length - 1) {
        const value = formData.getAll(key);
        if (0 in value) {
          base[chunk] = value.length > 1 ? value : value[0];
        }
      } else {
        if (
          typeof base[chunk] !== "object" ||
          Array.isArray(base[chunk]) ||
          base[chunk] instanceof File
        ) {
          base[chunk] = {};
        }
        base = base[chunk];
      }
    });
  });

  return result;
};
