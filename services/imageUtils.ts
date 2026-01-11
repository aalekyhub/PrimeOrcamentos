
/**
 * Comprime e redimensiona uma imagem no lado do cliente usando Canvas API.
 * Objetivo: Reduzir o tamanho do arquivo para caber no LocalStorage (limit ~5MB).
 * 
 * @param file Arquivo de imagem original
 * @param maxWidth Largura máxima permitida (default: 800px)
 * @param quality Qualidade do JPEG (0.0 a 1.0, default: 0.7)
 * @returns Promise com a string Base64 da imagem comprimida
 */
export const compressImage = (file: File, maxWidth = 800, quality = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;

            img.onload = () => {
                // Calcular novas dimensões mantendo proporção
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                // Criar canvas para desenhar a imagem redimensionada
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Falha ao obter contexto do Canvas'));
                    return;
                }

                // Desenhar imagem no canvas
                ctx.drawImage(img, 0, 0, width, height);

                // Exportar como JPEG comprimido (que geralmente é muito menor que PNG)
                // O formato 'image/jpeg' é essencial para o parâmetro quality funcionar
                const compressedBase64 = canvas.toDataURL('image/jpeg', quality);

                resolve(compressedBase64);
            };

            img.onerror = (error) => reject(error);
        };

        reader.onerror = (error) => reject(error);
    });
};
